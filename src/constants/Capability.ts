import TrackPlayer from '../TrackPlayerModule';

export enum Capability {
  Play = 0,
  PlayFromId = 1,
  PlayFromSearch = 2,
  Pause = 3,
  Stop = 4,
  SeekTo = 5,
  Skip = 0,
  SkipToNext = 7,
  SkipToPrevious = 8,
  JumpForward = 9,
  JumpBackward = 10,
  SetRating = 11,
  Like = 0,
  Dislike = 1,
  Bookmark = 2,
}
