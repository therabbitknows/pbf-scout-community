# R1 + Mentra Live Voice Bridge

This is the supported POC path for using a Rabbit R1 and Mentra Live together.
It is a bridge, not a RabbitOS port.

```text
Mentra Live mic
    -> MentraOS app session transcription
    -> authenticated PBF bridge
    -> R1 Creation
    -> Hermes / MoA / Ollama chat route
    -> authenticated PBF bridge
    -> MentraOS session.audio.speak()
    -> Mentra Live speaker
```

The R1 Creation remains a small control surface. It never receives raw frames,
PCM audio, Mentra API keys, or Hermes credentials. The Creation stores only the
operator-entered HTTPS URLs and dedicated bridge tokens.

## Implemented

- `listen_once`: waits for one final transcription from the active MentraOS
  session, with a 3-20 second server-side timeout.
- `chat`: the existing Hermes bridge route. The R1 sends the transcript to the
  selected route (`hermes-primary`, `hermes-moa`, or `local-qwen`).
- `speak`: sends the short answer to `session.audio.speak()` on Mentra Live.
- `GLASS VOICE`: R1 touch/dial action that runs the complete flow.
- Duplicate request caching and in-flight protection remain enabled.

## Why this is the boundary

Rabbit Creations are hosted web controls and do not host the native Mentra
Bluetooth SDK. Mentra's direct Bluetooth SDK is for Android, iOS, or React
Native apps. A true phone-free R1-to-Mentra raw-audio port would require an
unsupported RabbitOS native integration and is not part of this POC.

The raw-audio path remains a separate future native-phone mode. It must use the
official Mentra Bluetooth SDK, matching glasses firmware, explicit Bluetooth
and microphone permissions, and normal phone Bluetooth media routing. This cloud
session path uses final transcription and MentraOS TTS because it is smaller,
safer, and testable now.

## Setup and test

1. Launch the PBF Scout MentraOS app in the Mentra app and connect Mentra Live.
2. Confirm the app has microphone and audio permissions. The app must be in an
   active session; the bridge does not wake a disconnected pair.
3. In the R1 Creation, open `SETUP` and enter the Mentra app's public HTTPS
   command URL and its dedicated `PBF_R1_BRIDGE_TOKEN`.
4. Enter the Hermes bridge URL and token separately. Do not reuse the Mentra
   token for the Hermes bridge.
5. Select `GLASS VOICE` with the R1 dial or button.
6. When the R1 shows `Speak through Mentra Live now`, speak one short question.
7. Expect `Heard: ...`, then `THINKING`, then the answer through the Mentra
   speaker. If the answer is not heard, verify Android's Bluetooth media route.

Acceptance requires one transcript, one Hermes/Ollama request, and one spoken
answer. A second tap while listening must be rejected as in-flight. Timeout
must leave no stuck waiter. No frame, transcript, audio bytes, token, or
webhook may be written to logs.

## Current limitations

- MentraOS Cloud must have an active app session and its transcription stream.
- The R1 Creation does not expose raw Mentra PCM. Use the official native
  Bluetooth SDK bridge later if raw audio, local STT, or lower latency is needed.
- The R1's own microphone remains available through its normal Rabbit voice
  path; `GLASS VOICE` deliberately uses the Mentra session instead.
