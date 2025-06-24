/**
 * 2048游戏音效管理模块
 * 负责加载、播放和控制游戏中的所有音效
 */
class SoundManager {
    constructor() {
        // 音效状态（默认开启）
        this.soundEnabled = true;
        
        // 音效缓存
        this.sounds = {};
        
        // 初始化音效
        this.init();
    }
    
    /**
     * 初始化音效系统
     */
    init() {
        // 预加载所有音效
        this.loadSound('move', 'https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3');
        this.loadSound('merge', 'https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3');
        this.loadSound('newTile', 'https://assets.mixkit.co/active_storage/sfx/147/147-preview.mp3');
        this.loadSound('gameOver', 'https://assets.mixkit.co/active_storage/sfx/277/277-preview.mp3');
        this.loadSound('win', 'https://assets.mixkit.co/active_storage/sfx/217/217-preview.mp3');
    }
    
    /**
     * 加载单个音效
     * @param {string} name - 音效名称
     * @param {string} url - 音效文件URL
     */
    loadSound(name, url) {
        const audio = new Audio();
        audio.src = url;
        audio.preload = 'auto';
        this.sounds[name] = audio;
    }
    
    /**
     * 播放指定音效
     * @param {string} name - 音效名称
     */
    play(name) {
        if (!this.soundEnabled) return;
        
        // 如果音效存在，则播放
        if (this.sounds[name]) {
            // 克隆音频节点以允许重叠播放
            const sound = this.sounds[name].cloneNode();
            sound.volume = 0.3; // 设置音量
            sound.play().catch(e => console.log('音效播放失败:', e));
        }
    }
    
    /**
     * 切换音效开关状态
     * @returns {boolean} - 切换后的状态
     */
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        return this.soundEnabled;
    }
    
    /**
     * 获取当前音效状态
     * @returns {boolean} - 当前音效是否开启
     */
    isSoundEnabled() {
        return this.soundEnabled;
    }
}

// 导出音效管理器单例
const soundManager = new SoundManager();