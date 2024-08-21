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

import wantAgent from '@ohos.app.ability.wantAgent';
import backgroundTaskManager from '@ohos.resourceschedule.backgroundTaskManager';
import Logger from '../utils/Logger';
import { Context } from '@kit.AbilityKit';

const TAG = '[TrackPlayer_BackgroundTaskUtil]';

/**
 * Background task tool class.
 */
export class BackgroundTaskUtil {
  /**
   * Start a long-time task in the background.
   *
   * @param context Context.
   */
  public static startContinuousTask(context: Context, bundleName: string) {
    if (context === undefined) {
      Logger.info(TAG, 'startContinuousTask fail,context is empty.');
      return;
    }
    let wantAgentInfo = {
      // Action to be performed after a notification is clicked.
      wants: [
        {
          bundleName: bundleName,
          abilityName: "EntryAbility"
        }
      ],
      // Action type after a notification is clicked.
      operationType: wantAgent.OperationType.START_ABILITY,
      // A private value defined by the user.
      requestCode: 0,
    } as wantAgent.WantAgentInfo;

    // Obtain the WantAgent object by using the method of the wantAgent module.
    wantAgent.getWantAgent(wantAgentInfo).then((wantAgentObj) => {
      try {
        backgroundTaskManager.startBackgroundRunning(context, backgroundTaskManager.BackgroundMode.AUDIO_PLAYBACK,
          wantAgentObj).then(() => {
          Logger.info(TAG, 'startBackgroundRunning succeeded');
        }).catch((err: Error) => {
          Logger.error(TAG, 'startBackgroundRunning failed, Cause: ' + JSON.stringify(err));
        });
      } catch (error) {
        Logger.error(TAG, `startBackgroundRunning failed. code is ${error.code} message is ${error.message}`);
      }
    });
  }

  /**
   * Stopping a Long-Time Task in the Background.
   *
   * @param context context.
   */
  public static stopContinuousTask(context: Context) {
    if (context === undefined) {
      Logger.info(TAG, 'stopContinuousTask fail,context is empty.');
      return;
    }
    try {
      backgroundTaskManager.stopBackgroundRunning(context).then(() => {
        Logger.info(TAG, 'stopBackgroundRunning succeeded');
      }).catch((err: Error) => {
        Logger.error(TAG, 'stopBackgroundRunning failed Cause: ' + JSON.stringify(err));
      });
    } catch (error) {
      Logger.error(TAG, `stopBackgroundRunning failed. code is ${error.code} message is ${error.message}`);
    }
  }
}