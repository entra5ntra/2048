/**
 * 2048游戏音效管理模块
 * 负责加载、播放和控制游戏中的所有音效
 */
class SoundManager {
    constructor() {
        // 音效开关状态（默认开启）
        this.soundEnabled = true;
        // 音效缓存对象
        this.sounds = {};
        // 初始化加载音效文件
        this.init();
    }

    /**
     * 初始化音效系统：预加载所有需要的音效
     */
    init() {
        // 加载移动、合并、新生成、游戏结束、胜利等音效
        this.loadSound('move',    'https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3');
        this.loadSound('merge',   'https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3');
        this.loadSound('newTile', 'https://assets.mixkit.co/active_storage/sfx/147/147-preview.mp3');
        this.loadSound('gameOver','https://assets.mixkit.co/active_storage/sfx/277/277-preview.mp3');
        this.loadSound('win',     'https://assets.mixkit.co/active_storage/sfx/217/217-preview.mp3');
    }

    /**
     * 加载单个音效文件
     * @param {string} name 音效名称（用于标识）
     * @param {string} url 音效文件的URL地址
     */
    loadSound(name, url) {
        const audio = new Audio();
        audio.src = url;
        audio.preload = 'auto';
        // 将音频对象缓存
        this.sounds[name] = audio;
    }

    /**
     * 播放指定名称的音效
     * @param {string} name 音效名称
     */
    play(name) {
        if (!this.soundEnabled) return;  // 若音效已静音，则不播放

        const sound = this.sounds[name];
        if (sound) {
            // 每次播放时克隆一份音频节点，以允许同一音效重叠播放（例如多次合并）
            const clonedSound = sound.cloneNode();
            clonedSound.volume = 0.3;  // 设置音量大小（0.0~1.0）
            clonedSound.play().catch(e => {
                // 某些浏览器可能禁止自动播放，捕获异常避免报错
                console.warn('音效播放失败:', e);
            });
        }
    }

    /**
     * 切换音效开关状态（开启/关闭）
     * @returns {boolean} 返回切换后的音效状态（true为开启）
     */
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        return this.soundEnabled;
    }

    /**
     * 获取当前音效是否开启
     * @returns {boolean} 音效开启状态
     */
    isSoundEnabled() {
        return this.soundEnabled;
    }
}

// 创建并导出音效管理器的单例
const soundManager = new SoundManager();
