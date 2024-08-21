/*
 * MIT License
 *
 * Copyright (C) 2024 Huawei Device Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


/**
 * Common constants for all features.
 */
export class CommonConstants {
}

export type Track = {
  title?: string,
  album?: string,
  artist?: string,
  duration?: number,
  artwork?: string,
  description?: string,
  genre?: string,
  date?: string,
  rating?: number,
  isLiveStream?: boolean,
  url: string,
  type?: TrackType,
  userAgent?: string,
  contentType?: string,
  pitchAlgorithm?: PitchAlgorithm,
  headers?: {}
} | null

export enum PitchAlgorithm {
  Linear = 0,
  Music = 1,
  Voice = 2,
}

export enum TrackType {
  Default = 'default',
  Dash = 'dash',
  HLS = 'hls',
  SmoothStreaming = 'smoothstreaming',
}

/**
 * AvplayerStatus.
 */
export enum AvplayerStatus {
  IDLE = 'idle',
  INITIALIZED = 'initialized',
  PREPARED = 'prepared',
  PLAYING = 'playing',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  STOPPED = 'stopped',
  RELEASED = 'released',
  ERROR = 'error'
}

/**
 * Play Speed.
 */
export enum Speed {
  ZERO = 0.75,
  ONE = 1.00,
  TWO = 1.25,
  THREE = 1.75,
  FOUR = 2.00,
  FIVE = 0.50,
  SIX = 1.50,
  EIGHT = 0.25,
  NINE = 0.125
}
