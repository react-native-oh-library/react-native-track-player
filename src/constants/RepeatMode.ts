/*
 * Copyright (c) 2024 Huawei Device Co., Ltd. All rights reserved
 * Use of this source code is governed by a MIT license that can be
 * found in the LICENSE file.
 */
import TrackPlayer from '../TrackPlayerModule';

export enum RepeatMode {
  /** Playback stops when the last track in the queue has finished playing. */
  Off = 0,
  /** Repeats the current track infinitely during ongoing playback. */
  Track = 1,
  /** Repeats the entire queue infinitely. */
  Queue = 2,
}
