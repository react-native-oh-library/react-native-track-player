import TrackPlayer from '../TrackPlayerModule';

export enum RepeatMode {
  /** Playback stops when the last track in the queue has finished playing. */
  Off = 0,
  /** Repeats the current track infinitely during ongoing playback. */
  Track = 1,
  /** Repeats the entire queue infinitely. */
  Queue = 2,
}
