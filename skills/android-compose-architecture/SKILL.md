---
name: android-compose-architecture
description: Use when adding or restructuring a feature in a single-module Android app built with Jetpack Compose, Room, WorkManager and coroutines, with manual dependency injection (an AppContainer or AppGraph created in the Application class, no Hilt or Koin). Covers package layers, screen state from Room flows, one-off UI events, work that must outlive a screen or the process, offline sync, and coroutine error handling. Not for Kotlin Multiplatform or multi-module builds.
---

# Android Compose architecture (single module, manual DI)

How to place code and move data in a single-module Compose app whose
dependencies come from one container object built in `Application.onCreate`.
Room is the source of truth, screens read it as flows, and anything that must
finish after the user leaves goes to a process-wide scope or to WorkManager.

Not for: Kotlin Multiplatform, multi-module Gradle builds, or a project that
already uses Hilt or Koin (follow the project). Compose rendering performance,
motion and insets have their own skills: `jetpack-compose-performance`,
`compose-animations`, `edge-to-edge`. Tests: `android-testing`.

## When to use

- Adding a screen, a repository, a worker or a sync path to such an app.
- Deciding where a piece of logic lives, or which scope runs a coroutine.
- Reviewing a change for main-thread blocking, lost events, double sends or
  swallowed cancellation.

## Layers

| Package | Holds | May import |
|---|---|---|
| `core/` | Pure Kotlin: money, rules, parsing, policies, outcome types, state builders | Kotlin stdlib, `java.time`, kotlinx (serialization, coroutines core). Never `android.*` or `androidx.*` |
| `data/` | Room entities and DAOs, API client, settings and secret stores, repositories | `core/`, Android, Room, OkHttp |
| `ui/<screen>/` | `<Screen>State`, `<Screen>ViewModel`, `<Screen>Screen` composables | `core/`, `data/` |
| `work/` | Workers and the scheduler that enqueues them | `core/`, `data/` |
| root | `Application`, container, `MainActivity` | everything |

- Logic that can be pure goes to `core/`: it runs in plain JVM tests, without
  Robolectric. A ViewModel that computes totals inline should call a `core/`
  function instead.
- Add a use-case class only when two or more callers share the same
  multi-step logic. A repository plus `core/` functions is the default.
- Map Room entities to UI types in a pure builder (`buildWallet(...)` in
  `core/` or next to the state class) when the screen shows derived values.
  Passing an entity straight to a list row is fine when it shows its fields as
  they are.

## The container

```kotlin
/** One instance per process, created by App.onCreate. */
class AppContainer(context: Context) {
    val appContext: Context = context.applicationContext
    val db: AppDatabase by lazy { AppDatabase.open(appContext) }
    val clock: Clock = Clock.systemUTC()
    val api: NoteApi by lazy { NoteApi(OkHttpClient(), baseUrl = BuildConfig.API_URL) }

    /** Every path that writes synced data takes this lock: screen, worker, in-process send. */
    val syncLock = Mutex()

    /** Lives as long as the process: work started here outlives the screen that asked for it. */
    val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    val notes: NoteRepository by lazy { NoteRepository(db.noteDao(), api, clock, syncLock) }

    /** The single "send now" entry point: in this process at once, WorkManager as the fallback. */
    fun sendNow() {
        appScope.launch { notes.sync() }
        NotesSyncWorker.enqueueOnce(appContext)
    }
}
```

- The container is the only place that wires `data/` to `work/`. A
  ViewModel that must start a send receives `container::sendNow` (a
  `() -> Unit`), not `WorkManager` and not the scope.
- A composable gets the container from its caller (`MainActivity` passes it
  down) or from `(LocalContext.current.applicationContext as App).container`
  at the screen entry point only, never deeper in the tree.
- ViewModels get it through a factory:
  `viewModel(factory = viewModelFactory { initializer { NotesViewModel(container.notes) } })`.
  Pass the narrow dependency (`container.notes`), not the whole container,
  when the ViewModel needs one or two things.
- Workers get it from `(applicationContext as App).container`.
- Inject `Clock` (and a dispatcher, when a test must control it). Never call
  `System.currentTimeMillis()` or `Instant.now()` in `core/` or `data/`.

## Screen state

One immutable state per screen, built from Room flows, never copied into a
`MutableStateFlow` by an `init { collect }` block:

```kotlin
class NotesViewModel(
    private val repo: NoteRepository,
    private val sendNow: () -> Unit, // container::sendNow
) : ViewModel() {
    private val draft = MutableStateFlow("")

    // repo.syncStatus: Flow<SyncStatus>, built in data/ from the stored last error
    // and getWorkInfosForUniqueWorkFlow(name) (ENQUEUED = Pending, RUNNING = Sending).
    val state: StateFlow<NotesState> = combine(repo.observe(), draft, repo.syncStatus) { notes, d, sync ->
        NotesState(notes = notes, draft = d, sync = sync)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), NotesState())

    fun onDraftChange(text: String) { draft.value = text }
    fun onSyncNow() = sendNow()
}
```

- `WhileSubscribed(5_000)` keeps the upstream alive through a rotation and
  stops it when the screen is gone.
- Expose `StateFlow`/`Flow`, never the `MutableStateFlow`.
- In the composable, `collectAsStateWithLifecycle()` (artifact
  `androidx.lifecycle:lifecycle-runtime-compose`) stops collecting while the
  app is in the background; `collectAsState()` keeps collecting. Use the
  first in new code; do not churn existing screens just to switch.
- Split `NotesScreen(viewModel)` from a stateless
  `NotesContent(state, onDraftChange, onSave)`: previews and Compose tests
  drive the stateless one.
- Keep the navigation the project already has (its own shell or `NavHost`).

## One-off events (snackbar, navigation)

Prefer state: put the message in the state (`val error: SyncError?`) and add
`fun onErrorShown()` that clears it. It survives rotation and cannot be lost.

When a flow fits better, use a channel:

```kotlin
private val _events = Channel<NotesEvent>(Channel.BUFFERED)
val events: Flow<NotesEvent> = _events.receiveAsFlow()
// Screen: LaunchedEffect(viewModel) { viewModel.events.collect { ... } }
```

Never `MutableSharedFlow<Event>()` with the default `replay = 0`: an event
emitted while no collector is attached (rotation, screen in the background)
is dropped.

## Which scope runs the work

| The work must | Run it in |
|---|---|
| Stop when the screen goes away (load, search, validation) | `viewModelScope` |
| Finish after the user leaves the screen, while the process lives (send now) | `container.appScope` |
| Survive process death, wait for network, or repeat periodically | WorkManager (`CoroutineWorker`) |
| Start at once and still be guaranteed | Both: `appScope` now, plus a unique WorkManager request as the fallback |

`GlobalScope` and `runBlocking` are never the answer in app code.

## Sync and background work

1. **One writer at a time.** A manual sync, the periodic worker and an
   in-process send can overlap; distinct unique-work names do not serialize
   them. Every path that reads the pending set and marks it sent does so
   inside `container.syncLock.withLock { ... }`.
2. **Idempotent upload.** Send the local id with each item and mark synced
   only the ids that were sent. A retry after a crash between "uploaded" and
   "marked" must not create duplicates on the server.
3. **Never block the main thread on WorkManager.** No
   `ListenableFuture.get()`. Observe with
   `getWorkInfosForUniqueWorkFlow(name)` / `getWorkInfoByIdFlow(id)`, or
   `await()` from `kotlinx-coroutines-guava` inside a coroutine.
4. **Offline is a state, not a spinner.** A request with
   `NetworkType.CONNECTED` stays `ENQUEUED` until the network returns. Show
   "pending, sends when online" for `ENQUEUED`, progress only for `RUNNING`,
   the error for `FAILED`.
5. **Expedited work needs `getForegroundInfo()`.** Below API 31 an expedited
   request runs as a foreground service and `CoroutineWorker` throws without
   that override. Override it, or do not call `setExpedited`.
6. **Retry vs failure.** A transient error (`IOException`, HTTP 5xx) returns
   `Result.retry()` with a backoff and a cap on `runAttemptCount`; a
   permanent one (4xx, bad data) returns `Result.failure()` and stores the
   reason where the screen can read it.
7. Enqueue periodic work once with `enqueueUniquePeriodicWork(..., KEEP, ...)`
   from `Application.onCreate`, so app restarts do not stack copies.

## Coroutine errors

```kotlin
try {
    api.upload(batch)
} catch (e: CancellationException) {
    throw e // cancellation must propagate, or the scope keeps running a dead job
} catch (e: IOException) {
    return SendOutcome.Offline
}
```

- `catch (e: Exception)` and `runCatching { }` around a suspend call also
  catch `CancellationException`; rethrow it first, or do not use them there.
- Return a sealed outcome from `core/` (`SendOutcome.Sent`, `.Offline`,
  `.Rejected(code)`) instead of letting exceptions reach a ViewModel. The API
  client in `data/` makes the split: no response or a 5xx is `Offline`
  (retry), a 4xx is `Rejected(code)` (no retry). Never reuse
  `IllegalArgumentException` or another generic exception for it.
- Room `suspend` and `Flow` queries already run off the main thread. Use
  `withContext(Dispatchers.IO)` only around blocking calls: files, OkHttp
  `execute()`, `ContentResolver`.
- A long loop calls `ensureActive()` (or another suspend call) per item, so
  it can be cancelled.

## Common mistakes

| Mistake | Fix |
|---|---|
| `wm.getWorkInfosForUniqueWork(name).get()` from a ViewModel | Flow variant or `await()` in a coroutine |
| Manual and periodic sync can run together | Shared `Mutex` from the container around read-pending, upload, mark-synced |
| Spinner forever when offline | Map `ENQUEUED` to a pending state |
| `setExpedited(...)` without `getForegroundInfo()` | Add the override or drop expedited |
| `MutableSharedFlow()` for snackbar events | Message in state, or `Channel(BUFFERED).receiveAsFlow()` |
| Send started in `viewModelScope` | `appScope` or WorkManager, per the scope table |
| `runCatching { api.call() }` | Explicit catch with `CancellationException` rethrown |
| Business rule inside a ViewModel or composable | Pure function in `core/`, tested on the JVM |
| `android.*` import in `core/` | Move the Android part to `data/` behind a plain type |

## Checks

- `./gradlew :app:testDebugUnitTest :app:lintDebug` passes. With a device and
  an emulator both attached, pass the serial (`adb -s <serial>`,
  `ANDROID_SERIAL=<serial>`) to anything that installs or runs.
- `grep -rnE 'runBlocking|GlobalScope|\.get\(\)|MutableSharedFlow<' app/src/main`
  returns only lines you can justify.
- `test -d app/src/main/java && grep -rlE '^import (android|androidx)\.' --include='*.kt' app/src/main/java | grep '/core/'`
  prints nothing (use `app/src/main/kotlin` if the sources live there).
- The feature works with the network off: the pending state shows, and
  turning the network on sends once.
