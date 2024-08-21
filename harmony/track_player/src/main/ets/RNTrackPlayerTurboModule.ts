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
import { TurboModule } from '@rnoh/react-native-openharmony/ts';
import { TM } from '@rnoh/react-native-openharmony/generated/ts';
import Logger from '../utils/Logger';
import { BackgroundTaskUtil } from '../utils/BackgroundTaskUtil';
import { BusinessError } from '@kit.BasicServicesKit';
import media from '@ohos.multimedia.media';
import { LinkedList } from '@kit.ArkTS';
import { avSession as AVSessionManager } from '@kit.AVSessionKit';
import { AvplayerStatus, Speed } from '../constants/CommonConstants';
import { AvSessionUtil } from '../utils/AvSessionUtil';
import { resourceManager } from '@kit.LocalizationKit';

const TAG: string = "[RNOH] TrackPlayer"

type Progress = {
  position: number; // The playback position of the current track in seconds.
  duration: number; // The duration of the current track in seconds.
  buffered: number; // The buffered position of the current track in seconds.
}

export class RNTrackPlayerTurboModule extends TurboModule implements TM.ReactNativeTrackPlayer.Spec {
  public playerPool = new Map<Object, media.AVPlayer>();
  private queue: LinkedList<TM.ReactNativeTrackPlayer.Track> = new LinkedList();
  private isServiceBound: boolean = false
  public isPlaying: boolean = false;
  public isEnded: boolean = false;
  private player: media.AVPlayer;
  private playerState = AvplayerStatus.IDLE;
  private currentTimeMs: number = 0; //当前播放的曲目位置
  private currentTrackIndex: number = 0; // 当前曲目下标
  private playerVolume: number = 1; // 默认音量
  private playerRate: number = 1; // 默认播放速率
  private rate: number = 1.00; // 默认播放速率对应索引
  private buffered: number = 0; // 默认缓存进度
  private playRepeatMode = TM.ReactNativeTrackPlayer.RepeatMode.Off;
  private session: AVSessionManager.AVSession;
  private playbackState: AVSessionManager.AVPlaybackState = {
    state: 0,
    speed: this.playerRate,
    position: {
      elapsedTime: 1000, // 已经播放的位置，以ms为单位
      updateTime: new Date().getTime(), // 应用更新当前位置时的时间戳，以ms为单位
    },
    loopMode: 1,
    volume: this.playerVolume
  };
  private context = this.ctx.uiAbilityContext;

  setupPlayer(options?: TM.ReactNativeTrackPlayer.PlayerOptions): Promise<void> {
    Logger.info(TAG, 'setupPlayer ...options: ' + JSON.stringify(options));
    // Enable a long-term task to allow long-term playback in the background.
    let bundleName = this.context.abilityInfo.bundleName;
    BackgroundTaskUtil.startContinuousTask(this.context, bundleName);
    return new Promise(async (resolve, reject) => {
      let type: AVSessionManager.AVSessionType = 'audio';
      await AVSessionManager.createAVSession(this.context, 'SESSION_NAME', type).then((session) => {
        this.session = session;
        // 监听事件
        this.setListenerForMesFromController();
        this.session.activate();
        Logger.info(TAG, `session create done : sessionId : ${session.sessionId}`);
      });

      media.createAVPlayer((error: BusinessError, video: media.AVPlayer) => {
        if (video != null) {
          this.player = video;
          this.isServiceBound = true;
          Logger.info(TAG, 'Succeeded in creating AVPlayer');
        } else {
          this.isServiceBound = false;
          reject('Failed to create AVPlayer');
          Logger.info(TAG, `Failed to create AVPlayer, error message:${error.message}`);
          return;
        }
      });
      resolve()
    });
  }

  isServiceRunning(): Promise<boolean> {
    Logger.info(TAG, 'isServiceRunning ...')
    return new Promise(resolve => {
      resolve(this.isServiceBound)
    });
  }

  add(tracks: TM.ReactNativeTrackPlayer.Track[], insertBeforeIndex?: number): Promise<number | null> {
    Logger.info(TAG, 'add ...' + JSON.stringify(tracks))
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      if (insertBeforeIndex < -1 || insertBeforeIndex > this.queue.length) {
        reject('The track index is out of bounds')
      }
      // -1表示没有传递索引，因此应该插入到末尾。
      if (insertBeforeIndex === -1) {
        let result = this.queue.length;
        tracks.forEach((track) => {
          this.queue.add(track); // 末尾添加每个元素
        });
        resolve(result)
      } else {
        if (insertBeforeIndex >= this.currentTrackIndex) {
          this.currentTrackIndex = this.currentTrackIndex + tracks.length;
        }
        for (let i = 0; i < tracks.length; i++) {
          this.queue.insert(insertBeforeIndex + i, tracks[i]); // 插入的方式添加每个元素
        }
        resolve(insertBeforeIndex)
      }
    });
  }

  load(track: TM.ReactNativeTrackPlayer.Track): Promise<number | null> {
    Logger.info(TAG, 'load ...')
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      if (track == null) {
        resolve(null);
        return;
      }
      //如果队列为空则加入队列;
      if (this.queue.length == 0) {
        this.queue.add(track);
        resolve(null);
      } else {
        // 获取当前播放的索引,
        this.queue.insert(this.currentTrackIndex + 1, track);
        this.queue.removeByIndex(this.currentTrackIndex);
        this.player.reset().then(() => {
          this.setPlayerUrl(this.queue.get(this.currentTrackIndex).url);
          this.currentTimeMs = 0;
          Logger.info(TAG, 'load Succeeded in resetting');
        }, (err: BusinessError) => {
          Logger.info(TAG, 'Failed to reset,error message is :' + err.message)
        })
      }
    });
  }

  move(fromIndex: number, toIndex: number): Promise<void> {
    Logger.info(TAG, 'move ... fromIndex: ' + fromIndex + ' toIndex: ' + toIndex);
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      if (fromIndex < 0 || fromIndex >= this.queue.length || toIndex < 0) {
        throw new Error('The track index is out of bounds');
      }
      // 当前被移动曲目
      let track = this.queue.get(fromIndex);
      this.queue.removeByIndex(fromIndex);
      if (toIndex > fromIndex && toIndex >= this.queue.length) {
        this.queue.add(track);
        this.currentTrackIndex = this.queue.length - 1;
      } else {
        this.queue.insert(toIndex, track);
        if (this.currentTrackIndex === fromIndex) {
          this.currentTrackIndex = toIndex;
        } else if (fromIndex < toIndex && this.currentTrackIndex > fromIndex &&
          this.currentTrackIndex <= toIndex) {
          // 如果当前索引在fromIndex和toIndex之间，移动时需要减小1
          this.currentTrackIndex = this.currentTrackIndex - 1;
        } else if (fromIndex > toIndex && this.currentTrackIndex >= toIndex && this.currentTrackIndex < fromIndex) {
          // 如果当前索引在toIndex和fromIndex之间，移动时需要加1
          this.currentTrackIndex = this.currentTrackIndex + 1;
        }
      }
      resolve(null);
    });
  }

  remove(indexes: number[]): Promise<void> {
    Logger.info(TAG, 'remove ...' + indexes)
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      // 将indexes从大到小排序
      indexes = indexes.sort().reverse();
      indexes.forEach(index => {
        // 判断每个要删除的索引是否超出队列范围;
        if (index < 0 || index >= this.queue.length) {
          reject('One or more indexes was out of bounds');
          return;
        }
        if (index === this.currentTrackIndex) {
          Logger.info(TAG, 'remove index: ' + index);
          this.player.reset().then(() => {
            if (index === this.queue.length - 1) {
              this.currentTrackIndex = 0;
            }
            this.setPlayerUrl(this.queue.get(this.currentTrackIndex).url);
            Logger.info(TAG, 'remove Succeeded in resetting');
          }, (err: BusinessError) => {
            Logger.info(TAG, 'Failed to reset,error message is :' + err.message)
          })
        }
        // 删除
        this.queue.removeByIndex(index);
      });
      resolve(null)
    });
  }

  removeUpcomingTracks(): Promise<void> {
    Logger.info(TAG, 'removeUpcomingTracks ...')
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      if (this.queue.length - 1 === -1 || this.currentTrackIndex === -1) {
        return;
      }
      let track = this.queue.get(this.currentTrackIndex);
      try {
        this.queue.clear();
      } catch (err) {
        throw Error("This track status is abnormal. message: " + err)
      } finally {
        this.queue.add(track);
      }
      resolve()
    });
  }

  skip(index: number, initialPosition: number): Promise<void> {
    Logger.info(TAG, 'skip ... ')
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      if (index < 0 || initialPosition > (this.player.duration / 1000)) {
        throw new Error('This item parameters are abnormal');
      }
      try {
        this.currentTrackIndex = index;
        if (index >= this.queue.length) {
          this.currentTrackIndex = this.queue.length - 1;
        }
        this.player.reset().then(() => {
          this.setPlayerUrl(this.queue.get(this.currentTrackIndex).url);
          Logger.info(TAG, 'load Succeeded in resetting');
        }, (err: BusinessError) => {
          Logger.info(TAG, 'Failed to reset,error message is :' + err.message)
        })
      } catch (err) {
        throw Error("This item index $index does not exist. The size of the queue is ${queue.size} items.")
      }
      if (initialPosition >= 0) {
        this.currentTimeMs = initialPosition;
      }
      resolve(null);
    });
  }

  skipToNext(initialPosition: number): Promise<void> {
    Logger.info(TAG, 'skipToNext ...')
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      this.player.reset().then(() => {
        if (this.currentTrackIndex === this.queue.length - 1) {

          if (this.playRepeatMode === TM.ReactNativeTrackPlayer.RepeatMode.Off) {
            // 单次队列循环，依然播放最后一首
            this.currentTrackIndex = this.queue.length - 1;
          } else {
            // 播放第一首
            this.currentTrackIndex = 0;
          }
        } else {
          this.currentTrackIndex = this.currentTrackIndex + 1;
        }
        this.setPlayerUrl(this.queue.get(this.currentTrackIndex).url);

        Logger.info(TAG, 'skipToNext Succeeded in resetting');
      }, (err: BusinessError) => {
        Logger.info(TAG, 'Failed to reset,error message is :' + err.message)
      })
      if (initialPosition >= 0) {
        this.currentTimeMs = initialPosition;
      }
      resolve(null);
    });
  }

  skipToPrevious(initialPosition: number): Promise<void> {
    Logger.info(TAG, 'skipToPrevious ...')
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      this.player.reset().then(() => {
        if (this.currentTrackIndex === 0) {
          if (this.playRepeatMode === TM.ReactNativeTrackPlayer.RepeatMode.Off) {
            // 单次队列循环，依然播放第一首
            this.currentTrackIndex = 0;
          } else {
            // 播放最后
            this.currentTrackIndex = this.queue.length - 1;
          }
        } else {
          this.currentTrackIndex = this.currentTrackIndex - 1;
        }
        this.setPlayerUrl(this.queue.get(this.currentTrackIndex).url);

        Logger.info(TAG, 'skipToPrevious Succeeded in resetting');
      }, (err: BusinessError) => {
        Logger.info(TAG, 'Failed to reset,error message is :' + err.message)
      })
      if (initialPosition >= 0) {
        // 设置跳转时间
        this.currentTimeMs = initialPosition;
      }
      resolve(null);
    });
  }

  updateOptions(options: TM.ReactNativeTrackPlayer.UpdateOptions): Promise<void> {
    Logger.info(TAG, 'updateOptions ...options: ' + JSON.stringify(options))
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.');
      }
      resolve(null);
    });
  }

  updateMetadataForTrack(trackIndex: number, metadata: Object): Promise<void> {
    Logger.info(TAG, 'updateMetadataForTrack ...')
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.');
      }
      if (trackIndex < 0 || trackIndex >= this.queue.length) {
        reject('The index is out of bounds');
      } else {
        let track = this.queue.get(trackIndex);
        track.artwork = metadata['artwork'];
        track.title = metadata['title'];
        track.artist = metadata['artist'];
        track.album = metadata['album'];
        track.description = metadata['description'];
        track.genre = metadata['genre']
        track.date = metadata['date'];
        track.rating = metadata['rating'];
        track.duration = metadata['duration'];
        this.queue.set(trackIndex, track);
        if (trackIndex === this.currentTrackIndex) {
          Logger.info(TAG, 'updateMetadataForTrack ... trackIndex: ' + trackIndex + ' track: ' + JSON.stringify(track));
          AvSessionUtil.setSessionInfo(this.session, track);
        }
      }
      resolve(null);
    });
  }

  clearNowPlayingMetadata(): Promise<void> {
    Logger.info(TAG, 'clearNowPlayingMetadata ...')
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.');
      }
      if (this.queue.length === 0) {
        reject('There is no current item in the player');
      }
      AvSessionUtil.setSessionInfo(this.session, null);
      resolve(null);
    });
  }

  updateNowPlayingMetadata(metadata: Object): Promise<void> {
    Logger.info(TAG, 'updateNowPlayingMetadata ...' + ' metadata: ' + JSON.stringify(metadata))
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.');
      }
      if (this.queue.length === 0) {
        reject('There is no current item in the player');
      }
      let track = this.queue.get(this.currentTrackIndex);
      track.artwork = metadata['artwork'];
      track.title = metadata['title'];
      track.artist = metadata['artist'];
      track.album = metadata['album'];
      track.description = metadata['description'];
      track.genre = metadata['genre'];
      track.date = metadata['date'];
      track.rating = metadata['rating'];
      track.duration = metadata['duration'];
      AvSessionUtil.setSessionInfo(this.session, track);
      resolve(null);
    });
  }

  reset(): Promise<void> {
    Logger.info(TAG, 'reset ...');
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      try {
        this.player.reset().then(() => {
          Logger.info(TAG, 'Succeeded in resetting');
        }, (err: BusinessError) => {
          Logger.error(TAG, 'Failed to reset,error message is :' + err.message)
        })
        this.queue.clear();
        this.currentTrackIndex = 0;
      } catch (e) {
        Logger.error(TAG, `sound reset error: ${e}} `);
      }
      resolve()
    });
  }

  play(): Promise<void> {
    Logger.info(TAG, 'play ...');
    return new Promise(async (resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      this.playerStateListener();
      this.player.on('bufferingUpdate', (infoType: media.BufferingInfoType, value: number) => {
        Logger.info(TAG, 'bufferingUpdate called,and infoType value is:' + infoType + ', value is :' + value)
        // 缓存百分百
        if (infoType === media.BufferingInfoType.BUFFERING_PERCENT && value != 0) {
          this.buffered = value;
        }
      })
      if (this.player === undefined) {
        return;
      }
      if (this.playerState === AvplayerStatus.INITIALIZED) {
        await this.player.reset();
        Logger.info(TAG, 'play reset success');
      }
      Logger.info(TAG, 'currentTrackIndex: ' + this.currentTrackIndex);
      this.setPlayerUrl(this.queue.get(this.currentTrackIndex).url);
      //播放错误监听
      this.player.on('error', (err: BusinessError) => {
        Logger.error(TAG, `failed, code is ${err.code}, message is ${err.message}`);
        this.player.reset(); // 调用reset重置资源，触发idle状态
      })
      resolve()
    });
  }

  pause(): Promise<void> {
    Logger.info(TAG, 'pause ...');
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      Logger.info(TAG, 'isPlaying ： ' + this.isPlaying);
      if (this.isPlaying) {
        this.player.pause().then(() => {
          this.currentTimeMs = this.player.currentTime / 1000;
          this.setPLayState(3);
          Logger.info(TAG, 'AVPlayer pause success ');
        }, (err: BusinessError) => {
          Logger.error(TAG, `AVPlayer pause error${err.name}, message is ${err.message}`);
        })
      }
      resolve()
    });
  }

  stop(): Promise<void> {
    Logger.info(TAG, 'stop ...');
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      if (this.isPlaying) {
        this.currentTimeMs = this.player.currentTime / 1000;
        this.player.stop().then(() => {
          this.setPLayState(6);
          Logger.info(TAG, 'AVPlayer stop success  currentTimeMs： ' + this.currentTimeMs);
        }, (err: BusinessError) => {
          this.currentTimeMs = 0;
          Logger.error(TAG, `AVPlayer stop error${err.name}, message is ${err.message}`);
        })
      }
      resolve()
    });
  }

  setPlayWhenReady(playWhenReady: boolean): Promise<boolean> {
    Logger.info(TAG, 'setPlayWhenReady ...');
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      if (playWhenReady) {
        this.player.play();
      } else {
        this.player.pause();
      }
      resolve(null)
    });
  }

  getPlayWhenReady(): Promise<boolean> {
    Logger.info(TAG, 'getPlayWhenReady ...');
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      if (this.player.state == AvplayerStatus.PLAYING) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }

  seekTo(position: number): Promise<void> {
    Logger.info(TAG, 'seekTo ...position: ' + position);
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      let timeMs = position * 1000;
      if (timeMs <= 0) {
        return;
      } else if (timeMs >= this.player.duration) {
        this.player.seek(this.player.duration);
      } else {
        this.player.seek(timeMs);
        this.currentTimeMs = timeMs / 1000;
      }
      this.setPLayState(2);
      resolve(null);
    });
  }

  seekBy(offset: number): Promise<void> {
    Logger.info(TAG, 'seekBy ...offset : ' + offset);
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      this.currentTimeMs = this.player.currentTime / 1000;
      let timeMs = (offset + this.currentTimeMs) * 1000;
      if (timeMs <= 0) {
        return;
      } else if (timeMs >= this.player.duration) {
        this.player.seek(this.player.duration);
      } else {
        this.currentTimeMs = timeMs / 1000;
        this.player.seek(timeMs);
      }
      this.player.on('seekDone', (seekDoneTime: number) => {
        Logger.info(TAG, 'seekDone called,and seek time is:' + seekDoneTime)
      })
      this.setPLayState(2);
      resolve(null);
    });
  }

  setVolume(level: number): Promise<void> {
    Logger.info(TAG, 'setVolume ...');
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      if (level <= 0) {
        level = 0;
      } else if (level >= 1) {
        level = 1;
      }
      this.player.setVolume(level);
      this.player.on('volumeChange', (vol: number) => {
        this.playerVolume = level;
        Logger.info(TAG, 'volumeChange called,and new volume is :' + vol)
      })
      resolve(null)
    });
  }

  getVolume(): Promise<number> {
    Logger.info(TAG, 'getVolume ...');
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      Logger.info(TAG, 'now volume result' + this.playerVolume);
      resolve(this.playerVolume)
    });
  }

  setRate(rate: number): Promise<void> {
    Logger.info(TAG, 'setRate ...rate：' + rate);
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      this.player.on('speedDone', (rate: number) => {
        this.rate = rate;
        Logger.info(TAG, 'speedDone called,and speed value is:' + rate);
      });
      switch (rate) {
        case Speed.ZERO:
          this.player.setSpeed(media.PlaybackSpeed.SPEED_FORWARD_0_75_X)
          break;
        case Speed.ONE:
          this.player.setSpeed(media.PlaybackSpeed.SPEED_FORWARD_1_00_X)
          break;
        case Speed.TWO:
          this.player.setSpeed(media.PlaybackSpeed.SPEED_FORWARD_1_25_X)
          break;
        case Speed.THREE:
          this.player.setSpeed(media.PlaybackSpeed.SPEED_FORWARD_1_75_X)
          break;
        case Speed.FOUR:
          this.player.setSpeed(media.PlaybackSpeed.SPEED_FORWARD_2_00_X)
          break;
        case Speed.FIVE:
          this.player.setSpeed(media.PlaybackSpeed.SPEED_FORWARD_0_50_X)
          break;
        case Speed.SIX:
          this.player.setSpeed(media.PlaybackSpeed.SPEED_FORWARD_1_50_X)
          break;
        case Speed.EIGHT:
          this.player.setSpeed(media.PlaybackSpeed.SPEED_FORWARD_0_25_X)
          break;
        case Speed.NINE:
          this.player.setSpeed(media.PlaybackSpeed.SPEED_FORWARD_0_125_X)
          break;
      }
      resolve(null);
    });
  }

  setQueue(tracks: TM.ReactNativeTrackPlayer.Track[]): Promise<void> {
    Logger.info(TAG, 'setQueue ...');
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      this.queue.clear();
      tracks.forEach(item => {
        this.queue.add(item);
      })
      this.player.reset().then(() => {
        // 重新播放当前队列中第一首
        this.currentTrackIndex = 0;
        this.setPlayerUrl(this.queue.get(this.currentTrackIndex).url);
      }, (err: BusinessError) => {
        Logger.info(TAG, 'Failed to reset,error message is :' + err.message)
      })
      resolve(null)
    });
  }

  setRepeatMode(mode: TM.ReactNativeTrackPlayer.RepeatMode): Promise<TM.ReactNativeTrackPlayer.RepeatMode> {
    Logger.info(TAG, 'setRepeatMode ...');
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      this.playRepeatMode = mode;
      resolve(this.playRepeatMode);
    });
  }

  getRate(): Promise<number> {
    Logger.info(TAG, 'getRate ...');
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      switch (this.rate) {
        case 0:
          this.playerRate = 0.75;
          break;
        case 1:
          this.playerRate = 1.00;
          break;
        case 2:
          this.playerRate = 1.25;
          break;
        case 3:
          this.playerRate = 1.75;
          break;
        case 4:
          this.playerRate = 2.00;
          break;
        case 5:
          this.playerRate = 0.50;
          break;
        case 6:
          this.playerRate = 1.50;
          break;
        case 8:
          this.playerRate = 0.25;
          break;
        case 9:
          this.playerRate = 0.125;
          break;
      }
      Logger.info(TAG, 'now rate result: ' + this.playerRate);
      resolve(this.playerRate);
    });
  }

  getTrack(index: number): Promise<TM.ReactNativeTrackPlayer.Track | null> {
    Logger.info(TAG, 'getTrack ...');
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      if (index >= 0 && index < this.queue.length) {
        resolve(this.queue.get(index));
      } else {
        resolve(null);
      }
    });
  }

  getQueue(): Promise<TM.ReactNativeTrackPlayer.Track[]> {
    Logger.info(TAG, 'getQueue ...');
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      let result: TM.ReactNativeTrackPlayer.Track[] = [];
      if (this.queue.length != 0) {
        this.queue.forEach((item) => {
          result.push(item);
        });
      }
      resolve(result)
    });
  }

  getActiveTrackIndex(): Promise<number | null> {
    Logger.info(TAG, 'getActiveTrackIndex ...');
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      if (this.queue.length === 0) {
        resolve(null);
      } else {
        resolve(this.currentTrackIndex);
      }
    });
  }

  getActiveTrack(): Promise<TM.ReactNativeTrackPlayer.Track | null> {
    Logger.info(TAG, 'getActiveTrack ...');
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      if (this.queue.length === 0) {
        resolve(null);
      } else {
        resolve(this.queue.get(this.currentTrackIndex));
      }
    });
  }

  getDuration(): Promise<number> {
    Logger.info(TAG, 'getDuration ...');
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      resolve(this.player.duration / 1000);
    });
  }

  getBufferedPosition(): Promise<number> {
    Logger.info(TAG, 'getBufferedPosition ...');
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      resolve((this.player.duration * (this.buffered / 100)) / 1000)
    });
  }

  getPosition(): Promise<number> {
    Logger.info(TAG, 'getPosition ...');
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      resolve(this.player.currentTime / 1000);
    });
  }

  getProgress(): Promise<TM.ReactNativeTrackPlayer.Progress> {
    Logger.info(TAG, 'getProgress ...');
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      let progress: Progress = {
        position: this.player.currentTime / 1000,
        duration: this.player.duration / 1000,
        buffered: (this.player.duration * (this.buffered / 100)) / 1000
      }
      resolve(progress)
    });
  }

  getPlaybackState(): Promise<Object> {
    Logger.info(TAG, 'getPlaybackState ...');
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      switch (this.player.state) {
        case AvplayerStatus.IDLE:
          resolve({ state: 'none', });
          break;
        case AvplayerStatus.PREPARED:
          resolve({ state: 'ready', });
          break;
        case AvplayerStatus.PLAYING:
          resolve({ state: 'playing', });
          break;
        case AvplayerStatus.PAUSED:
          resolve({ state: 'paused', });
          break;
        case AvplayerStatus.STOPPED:
          resolve({ state: 'stopped', });
          break;
        case AvplayerStatus.INITIALIZED:
          resolve({ state: 'loading', });
          break;
        case AvplayerStatus.COMPLETED:
          if (this.isEnded) {
            resolve({ state: 'ended', });
          }
          break;
        case AvplayerStatus.ERROR:
          this.player.on('error', (err: BusinessError) => {
            Logger.info(TAG, 'case avRecorder.on(error) called, errMessage is ' + err.message);
            resolve({
              state: 'error',
              error: {
                code: err.code,
                message: err.message,
              }
            })
          });
          break;
      }
    });
  }

  getRepeatMode(): Promise<TM.ReactNativeTrackPlayer.RepeatMode> {
    Logger.info(TAG, 'getRepeatMode ...');
    return new Promise((resolve, reject) => {
      if (!this.isServiceBound) {
        reject('The player is not initialized. Call setupPlayer first.')
      }
      resolve(this.playRepeatMode)
    });
  }

  retry(): void {
    Logger.info(TAG, 'retry ...');
    if (!this.isServiceBound) {
      new Error('The player is not initialized. Call setupPlayer first.')
    }
    this.player.prepare((err: BusinessError) => {
      if (err) {
        Logger.info(TAG, 'Succeeded in preparing');
      } else {
        Logger.error(TAG, 'Failed to prepare,error message is :' + err.message)
      }
    })
  }

  loopPlay() {
    // 队列播放,播放至最后一首
    if (this.playRepeatMode === TM.ReactNativeTrackPlayer.RepeatMode.Off) {
      this.currentTrackIndex++;
      if (this.currentTrackIndex >= this.queue.length) {
        this.currentTrackIndex = 0;
        this.isEnded = true;
        this.player.release((err) => {
          if (err == null) {
            Logger.info(TAG, 'reset success');
          } else {
            Logger.error(TAG, 'release filed,error message is :' + err.message)
          }
        })
        return;
      }
    }
    // 队列循环播放
    if (this.playRepeatMode === TM.ReactNativeTrackPlayer.RepeatMode.Queue) {
      let nextIndexRandom = 0;
      this.queue.forEach((_item, index) => {
        if (index === this.currentTrackIndex) {
          nextIndexRandom = index + 1 >= this.queue.length ? 0 : index + 1
          return;
        }
      })
      this.currentTrackIndex = nextIndexRandom;
    }
    // 单曲循环
    if (this.playRepeatMode === TM.ReactNativeTrackPlayer.RepeatMode.Track) {
      this.currentTrackIndex = this.currentTrackIndex;
    }
  }

  setPlayerUrl(url: string) {
    if (url === null) {
      throw new Error('The url is null');
    } else {
      if (typeof url === 'string') {
        // 音频资源是网络资源
        if (url.startsWith("http://") || url.startsWith("https://")) {
          this.player.url = url;
        } else {
          // 资源在resources/rawfile 下的资源  url: 'xxx.mp3',
          this.setPlayerFdSrc(url)
        }
      } else {
        if (typeof url === 'object' && url['__packager_asset']) {
          // 在npm run dev起服务的时候 用require('./frog.wav') 引入的文件
          let fileUrl: string = url['uri'];
          this.setPlayerFdSrc(`assets/${fileUrl.split('//')[1]}`)
        }
      }
    }
  }

  setPlayerFdSrc(path: string) {
    try {
      this.context.resourceManager.getRawFd(path,
        (error: BusinessError, value: resourceManager.RawFileDescriptor) => {
          if (error != null) {
            Logger.error(TAG, `callback getRawFd failed error code: ${error.code}, message: ${error.message}.`);
          } else {
            this.player.fdSrc = value;
          }
        });
    } catch (error) {
      let code = (error as BusinessError).code;
      let message = (error as BusinessError).message;
      Logger.error(TAG, `callback getRawFd failed, error code: ${code}, message: ${message}.`);
    }
  }

  setListenerForMesFromController() {
    this.session.on('play', () => {
      Logger.info(TAG, `on play , do play task`);
      this.play();
    });
    this.session.on('pause', () => {
      Logger.info(TAG, `on pause , do pause task`);
      this.pause();
    });
    this.session.on('playNext', () => {
      Logger.info(TAG, `on playNext , do playNext task`);
      this.skipToNext(0);
    });
    this.session.on('playPrevious', () => {
      Logger.info(TAG, `on playPrevious , do playPrevious task`);
      this.skipToPrevious(0);
    });
    this.session.on('setSpeed', (speed) => {
      Logger.info(TAG, `on setSpeed , the speed is ${speed}`);
      this.setRate(speed);
    });
    this.session.on('seek', (time) => {
      Logger.info(TAG, `on seek , the seek time is ${time}`);
      this.player.seek(time);
    });
    this.session.on('setLoopMode', (mode) => {
      Logger.info(TAG, `on setLoopMode , the loop mode is ${mode}`);
    });
  }

  playerStateListener() {
    this.player.on('stateChange', async (state) => {
      switch (state) {
        case AvplayerStatus.IDLE: // This state machine is triggered after the reset interface is successfully invoked.
          Logger.info(TAG, 'state idle called');
          break;
        case AvplayerStatus.INITIALIZED: // This status is reported after the playback source is set.
          Logger.info(TAG, `state initialized called : ${this.currentTrackIndex}`);
          this.playerState = AvplayerStatus.INITIALIZED;
          // 设置元数据
          if (this.session != null) {
            // 设置元数据
            AvSessionUtil.setSessionInfo(this.session, this.queue.get(this.currentTrackIndex));
          }
          this.player.prepare().then(() => {
            Logger.info(TAG, 'prepare success');
          }, (err) => {
            Logger.error(TAG, `prepare failed,error message is: ${err.message}`);
          });
          break;
        case AvplayerStatus.PREPARED:
          Logger.info(TAG, 'state prepared called');
          this.player.play();
          break;
        case AvplayerStatus.PLAYING: // play成功调用后触发该状态机上报
          Logger.info(TAG, `state playing currentTimeMs: ${this.currentTimeMs}`);
          if (this.currentTimeMs > 0) {
            this.player.seek(this.currentTimeMs * 1000);
          }
          this.setPLayState(2);
          this.isPlaying = true;
          break;
        case AvplayerStatus.COMPLETED: // 播放结束后触发该状态机上报
          Logger.info(TAG, 'stateChange AVPlayer state completed Start play callback.');
          this.isPlaying = false;
          this.currentTimeMs = 0;
          if (this.playerState === AvplayerStatus.INITIALIZED) {
            await this.player.reset();
            Logger.info(TAG, 'play reset success');
          }
          this.loopPlay();
          this.setPlayerUrl(this.queue.get(this.currentTrackIndex).url);
          break;
        default:
          this.isPlaying = false;
          Logger.info(TAG, 'stateChange AVPlayer state unknown called.');
          break;
      }
    });
  }

  setPLayState(state: number) {
    this.playbackState.state = state;
    this.playbackState.position = {
      elapsedTime: this.currentTimeMs * 1000, // 已经播放的位置，以ms为单位
      updateTime: new Date().getTime(), // 应用更新当前位置时的时间戳，以ms为单位
    }
    AvSessionUtil.setPlaybackState(this.session, this.playbackState);
  }
}

