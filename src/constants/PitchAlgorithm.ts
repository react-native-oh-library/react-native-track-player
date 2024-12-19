/*
 * Copyright (c) 2024 Huawei Device Co., Ltd. All rights reserved
 * Use of this source code is governed by a MIT license that can be
 * found in the LICENSE file.
 */
import TrackPlayer from '../TrackPlayerModule';

export enum PitchAlgorithm {
  /**
   * A high-quality time pitch algorithm that doesn’t perform pitch correction.
   * */
  // Linear = TrackPlayer.PITCH_ALGORITHM_LINEAR,
  /**
   * A highest-quality time pitch algorithm that’s suitable for music.
   **/
  // Music = TrackPlayer.PITCH_ALGORITHM_MUSIC,
  /**
   * A modest quality time pitch algorithm that’s suitable for voice.
   **/
  // Voice = TrackPlayer.PITCH_ALGORITHM_VOICE,
  Linear = 0,
  Music = 1,
  Voice = 2,
}
