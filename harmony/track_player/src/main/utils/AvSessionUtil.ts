/**
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
import { avSession as AVSessionManager } from '@kit.AVSessionKit';
import Logger from './Logger';
import { BusinessError } from '@kit.BasicServicesKit';
import { Track } from './..//constants/CommonConstants';

const TAG = '[TrackPlayer_AvSessionUtil]';

/**
 * Media session tool class.
 */
export class AvSessionUtil {
  public static async setSessionInfo(session: AVSessionManager.AVSession, track: Track) {
    let metadata: AVSessionManager.AVMetadata;
    if (track === null) {
      // 设置必要的媒体信息
      metadata = {
        assetId: ' ',
      }
    } else {
      Logger.info(TAG, `SetAVMetadata  track: ${JSON.stringify(track)}`);
      // 设置必要的媒体信息
      metadata = {
        assetId: '0', // 由应用指定，用于标识应用媒体库里的媒体
      };
      if (track.title != undefined && track.title != '') {
        metadata.title = track.title;
      }
      if (track.artist != undefined && track.artist != '') {
        metadata.artist = track.artist;
      }
      if (track.duration != undefined) {
        metadata.duration = track.duration * 1000;
      }
      if (track.artwork != undefined && track.artwork != '') {
        metadata.mediaImage = track.artwork;
      }
      if (track.album != undefined && track.album != '') {
        metadata.mediaImage = track.album;
      }
      if (track.description != undefined && track.description != '') {
        metadata.description = track.description;
      }
      if (track.date != undefined && track.date != '') {
        metadata.publishDate = new Date(track.date);
      }
    }
    session.setAVMetadata(metadata).then(() => {
      Logger.info(TAG, `SetAVMetadata successfully`);
    }).catch((err: BusinessError) => {
      Logger.error(TAG, `Failed to set AVMetadata. Code: ${err.code}, message: ${err.message}`);
    });
  }

  public static async setPlaybackState(session: AVSessionManager.AVSession,
    AVPlaybackState: AVSessionManager.AVPlaybackState) {
    // 简单设置一个播放状态
    let playbackState: AVSessionManager.AVPlaybackState = {
      state: AVPlaybackState.state,
      speed: AVPlaybackState.speed,
      position: AVPlaybackState.position,
      loopMode: AVPlaybackState.loopMode,
      volume: AVPlaybackState.volume
    };
    session.setAVPlaybackState(playbackState, (err: BusinessError) => {
      if (err) {
        Logger.error(TAG, `Failed to set AVPlaybackState. Code: ${err.code}, message: ${err.message}`);
      } else {
        Logger.info(TAG, `SetAVPlaybackState successfully ${JSON.stringify(playbackState)}`);
      }
    });
  }
}