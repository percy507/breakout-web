import { AUDIO_VOLUME_MULTIPLIER } from './constants';
import type { GameState, SoundType } from './types';

/** 解锁或恢复浏览器音频上下文，必须由用户手势触发 */
export function unlockAudio(game: GameState) {
  if (game.muted) {
    return;
  }

  if (!game.audioContext) {
    try {
      const AudioContextClass =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }
      game.audioContext = new AudioContextClass();
    } catch (error) {
      console.warn('初始化音频失败', error);
      return;
    }
  }

  if (game.audioContext.state === 'suspended') {
    void game.audioContext.resume();
  }
}

/** 播放短促合成音效，并对高频碰撞音做节流 */
export function playSound(game: GameState, type: SoundType) {
  if (game.muted) {
    return;
  }

  unlockAudio(game);
  const audioContext = game.audioContext;
  if (!audioContext) {
    return;
  }

  const settings: Record<
    SoundType,
    { frequency: number; duration: number; wave: OscillatorType; volume: number }
  > = {
    paddle: { frequency: 260, duration: 0.06, wave: 'triangle', volume: 0.08 },
    wall: { frequency: 180, duration: 0.04, wave: 'square', volume: 0.045 },
    brick: { frequency: 420, duration: 0.05, wave: 'square', volume: 0.06 },
    break: { frequency: 640, duration: 0.09, wave: 'sawtooth', volume: 0.075 },
    power: { frequency: 880, duration: 0.12, wave: 'sine', volume: 0.09 },
    lose: { frequency: 120, duration: 0.18, wave: 'triangle', volume: 0.09 },
    win: { frequency: 740, duration: 0.22, wave: 'sine', volume: 0.1 },
  };
  const sound = settings[type];
  const startTime = audioContext.currentTime;
  const cooldown = getSoundCooldown(type);
  const lastSoundTime = game.lastSoundTimes[type] ?? 0;
  if (startTime - lastSoundTime < cooldown) {
    return;
  }

  game.lastSoundTimes[type] = startTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = sound.wave;
  oscillator.frequency.setValueAtTime(sound.frequency, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(40, sound.frequency * 0.55),
    startTime + sound.duration,
  );
  gain.gain.setValueAtTime(sound.volume * AUDIO_VOLUME_MULTIPLIER, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + sound.duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
  oscillator.start(startTime);
  oscillator.stop(startTime + sound.duration);
}

/** 返回指定音效的最小播放间隔 */
function getSoundCooldown(type: SoundType) {
  if (type === 'wall' || type === 'brick' || type === 'paddle') {
    return 0.035;
  }
  if (type === 'break') {
    return 0.025;
  }
  return 0.08;
}
