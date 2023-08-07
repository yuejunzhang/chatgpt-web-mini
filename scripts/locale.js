const localeList = ["en", "zh"];
let locale; // UI语言
const setLangEle = document.getElementById("setLang");
const setLang = () => {
    let langClass = locale + "Lang";
    localStorage.setItem("UILang", locale)
    setLangEle.classList = "setDetail themeDetail langDetail " + langClass;
}
setLangEle.onclick = (ev) => {
    let idx = Array.prototype.indexOf.call(setLangEle.children, ev.target);
    if (locale !== localeList[idx]) {
        locale = localeList[idx];
        setLang();
        changeLocale();
    }
}
const initLang = () => {
    let localLang = localStorage.getItem("UILang") || "zh";
    let isInit = locale === void 0;
    if (locale !== localLang) {
        locale = localLang;
        if (!isInit) changeLocale();
    };
    setLang();
}
initLang();
const translations = {
    "en": {
        "description": "Simple and powerful ChatGPT app",
        "newChat": "New chat",
        "newChatName": "New chat",
        "newFolder": "New folder",
        "newFolderName": "New folder",
        "search": "Search",
        "forceRe": "Force refresh",
        "clearAll": "Clear all chats",
        "setting": "Setting",
        "nav": "Navigate",
        "winedWin": "Window",
        "fullWin": "Full screen",
        "quickSet": "Quick setting",
        "chat": "Chat",
        "tts": "TTS",
        "stt": "STT",
        "gptModel": "GPT model",
        "gptBrowsing": "GPT-4-browsing",
        "avatar": "Avatar",
        "systemRole": "System role",
        "presetRole": "Preset",
        "default": "Default",
        "assistant": "Assistant",
        "Programmer": "Programmer",
        "emoji": "Emoji",
        "withImg": "Image",
        "defaultText": " ",
        "assistantText": "You are a helpful assistant, answer as concisely as possible.",
        "ProgrammerText": "You are an experienced programmer proficient in various programming languages",
        "emojiText": "Your personality is very lively, there must be at least one emoji icon in every sentence",
        "imageText": "When you need to send pictures, please generate them in markdown language, without backslashes or code boxes. When you need to use the unsplash API, follow the format, https://source.unsplash.com/960x640/?<English keywords>",
        "nature": "Nature",
        "natureNeg": "Accurate",
        "naturePos": "Creativity",
        "quality": "Quality",
        "qualityNeg": "Repetitive",
        "qualityPos": "Nonsense",
        "chatsWidth": "Chats width",
        "typeSpeed": "Typing speed",
        "continuousLen": "Continuous context",
        "msgAbbr": " msgs.",
        "slow": "Slow",
        "fast": "Fast",
        "longReply": "Long reply",
        "ttsService": "TTS API",
        "azureTTS": "Azure",
        "edgeTTS": "Edge",
        "systemTTS": "System",
        "azureRegion": "Azure region",
        "loadVoice": "Load voice",
        "voiceName": "Choose voice",
        "userVoice": "User voice",
        "replyVoice": "Reply voice",
        "TTSTest": "Hello, nice to meet you.",
        "play": "Play",
        "pause": "Pause",
        "resume": "Resume",
        "stop": "Stop",
        "style": "Style",
        "role": "Role",
        "volume": "Volume",
        "low": "Low",
        "high": "High",
        "rate": "Rate",
        "slow": "Slow",
        "fast": "Fast",
        "pitch": "Pitch",
        "neutral": "Neutral",
        "intense": "Intense",
        "contSpeech": "Continuous speech",
        "autoSpeech": "Auto speech",
        "unsupportRecTip": "Voice recognition is not supported in the current environment. Please refer to the documentation.",
        "lang": "Language",
        "dialect": "Dialect",
        "autoSendKey": "Auto send keyword",
        "autoStopKey": "Auto stop keyword",
        "autoSendDelay": "Auto send delay time",
        "second": "s",
        "keepListenMic": "Keep listen",
        "send": "Send",
        "askTip": "Type message here",
        "clearChat": "Clear chat",
        "general": "General",
        "hotkey": "Hotkey",
        "data": "Data",
        "theme": "Theme",
        "darkTheme": "Dark",
        "lightTheme": "Light",
        "autoTheme": "Auto",
        "systemTheme": "System",
        "customDarkTheme": "Custom dark theme",
        "startDark": "Start",
        "endDark": "End",
        "aiEndpoint": "OpenAI endpoint",
        "aiKey": "OpenAI API key",
        "checkBill": "Check bill",
        "used": "Used ",
        "available": "Avail ",
        "navKey": "Toggle nav",
        "fullKey": "Window size",
        "themeKey": "Toggle theme",
        "themeKey": "Toggle lang",
        "inputKey": "Message",
        "voiceKey": "Voice",
        "recKey": "Recognition",
        "speechKey": "Start speech",
        "export": "Export",
        "import": "Import",
        "clear": "Clear",
        "reset": "Reset",
        "localStore": "Local storage",
        "forceReTip": "Force refresh page?",
        "noSpeechTip": "No speech was detected. You may need to adjust your microphone settings.",
        "noMicTip": "No microphone was found. Ensure that a microphone is installed and microphone settings are configured correctly.",
        "noMicPerTip": "Permission to use microphone is blocked.",
        "azureInvalidTip": "Access is denied due to invalid access key or API endpoint!",
        "thisQuota": "This month's quota",
        "freeTierTip": "Free tier - valid until: ",
        "errorAiKeyTip": "Invalid or incorrect API key, please check API key!",
        "copyCode": "Copy code",
        "copySuccess": "Success",
        "update": "Update",
        "cancel": "Cancel",
        "delMsgTip": "Delete this message?",
        "edit": "Edit",
        "refresh": "Refresh",
        "continue": "Continue",
        "copy": "Copy",
        "del": "Delete",
        "downAudio": "Download audio",
        "speech": "Speech",
        "chats": " chats",
        "delFolderTip": "Delete this folder?",
        "delChatTip": "Delete this chat?",
        "exportSuccTip": "Export successful!",
        "importSuccTip": "Import successful!",
        "importFailTip": "Import failed, please check the file format!",
        "clearChatSuccTip": "Clear chats data successful!",
        "resetSetSuccTip": "Reset settings successful!",
        "clearAllTip": "Delete all chats and folders?",
        "resetSetTip": "Restore all settings to default?",
        "hotkeyConflict": "Hotkey conflict, please choose another key!",
        "customDarkTip": "Start time and end time cannot be the same!",
        "timeoutTip": "Request timeout, please try again later!",
        "largeReqTip": "Request is too large, please delete part of the chat or cancel continuous chat!",
        "noModelPerTip": "Not permission to use this model, please choose another GPT model!",
        "apiRateTip": "Trigger API call rate limit, please try again later!",
        "exceedLimitTip": "API usage exceeded limit, please check your bill!",
        "badGateTip": "Gateway error or timeout, please try again later!",
        "badEndpointTip": "Failed to access the endpoint, please check the endpoint!",
        "clearChatTip": "Clear this chat?",
        "cantSpeechTip": "Current voice cannot synthesize this message, please choose another voice or message!",
    },
    "zh": {
        "description": "简洁而强大的ChatGPT应用",
        "newChat": "新建会话",
        "newChatName": "新的会话",
        "newFolder": "新建文件夹",
        "newFolderName": "新文件夹",
        "search": "搜索",
        "forceRe": "强制刷新",
        "clearAll": "清空全部",
        "setting": "设置",
        "nav": "导航",
        "winedWin": "窗口",
        "fullWin": "全屏",
        "quickSet": "快速设置",
        "chat": "会话",
        "tts": "语音合成",
        "stt": "语音识别",
        "gptModel": "GPT模型",
        "gptBrowsing": "GPT-4-联网",
        "avatar": "用户头像",
        "systemRole": " ",
        "presetRole": "设定角色",
        "default": "默认",
        "assistant": "助手",
        "Programmer": "编程师",
        "emoji": "表情",
        "withImg": "有图",
        "defaultText": " ",
        "assistantText": "你是一个乐于助人的助手，尽量简明扼要地回答",
        "ProgrammerText": "你是一位经验丰富的编程师，精通各种编程语言",
        "emojiText": "你的性格很活泼，每句话中都要有至少一个emoji图标",
        "imageText": "当你需要发送图片的时候，请用 markdown 语言生成，不要反斜线，不要代码框，需要使用 unsplash API时，遵循一下格式， https://source.unsplash.com/960x640/? ＜英文关键词＞",
        "nature": "角色性格",
        "natureNeg": "准确严谨",
        "naturePos": "灵活创新",
        "quality": "回答质量",
        "qualityNeg": "重复保守",
        "qualityPos": "胡言乱语",
        "chatsWidth": "会话宽度",
        "typeSpeed": "打字机速度",
        "continuousLen": "连续会话上下文信息",
        "msgAbbr": "条",
        "slow": "慢",
        "fast": "快",
        "longReply": "长回复",
        "ttsService": "语音合成服务",
        "azureTTS": "Azure语音",
        "edgeTTS": "Edge语音",
        "systemTTS": "系统语音",
        "azureRegion": "Azure区域",
        "loadVoice": "加载语音",
        "voiceName": "选择语音",
        "userVoice": "用户语音",
        "replyVoice": "回答语音",
        "TTSTest": "你好，很高兴认识你。",
        "play": "播放",
        "pause": "暂停",
        "resume": "恢复",
        "stop": "停止",
        "style": "风格",
        "role": "角色",
        "volume": "音量",
        "low": "低",
        "high": "高",
        "rate": "语速",
        "slow": "慢",
        "fast": "快",
        "pitch": "音调",
        "neutral": "平淡",
        "intense": "起伏",
        "contSpeech": "连续朗读",
        "autoSpeech": "自动朗读",
        "unsupportRecTip": "当前环境不支持语音识别，请查阅文档。",
        "lang": "语言",
        "dialect": "方言",
        "autoSendKey": "自动发送关键词",
        "autoStopKey": "自动停止关键词",
        "autoSendDelay": "自动发送延迟时间",
        "second": "秒",
        "keepListenMic": "保持监听",
        "send": "发送",
        "askTip": "来问点什么吧",
        "clearChat": "清空会话",
        "general": "通用",
        "hotkey": "快捷键",
        "data": "数据",
        "theme": "主题",
        "darkTheme": "深色",
        "lightTheme": "浅色",
        "autoTheme": "自动",
        "systemTheme": "跟随系统",
        "customDarkTheme": "自定义深色主题时间",
        "startDark": "开始时间",
        "endDark": "结束时间",
        "aiEndpoint": "OpenAI接口",
        "aiKey": "API密钥",
        "checkBill": "检查API额度",
        "used": "已用 ",
        "available": "可用 ",
        "navKey": "切换导航",
        "fullKey": "全屏/窗口",
        "themeKey": "切换主题",
        "langKey": "切换语言",
        "inputKey": "输入框",
        "voiceKey": "语音",
        "recKey": "语音输入",
        "speechKey": "朗读会话",
        "export": "导出",
        "import": "导入",
        "clear": "清空",
        "reset": "重置",
        "localStore": "本地存储",
        "forceReTip": "是否强制刷新页面？",
        "noSpeechTip": "未识别到语音，请调整麦克风后重试！",
        "noMicTip": "未识别到麦克风，请确保已安装麦克风！",
        "noMicPerTip": "未允许麦克风权限！",
        "azureInvalidTip": "由于订阅密钥无效或 API 端点错误，访问被拒绝！",
        "thisQuota": "本月额度",
        "freeTierTip": "免费额度-有效期至: ",
        "errorAiKeyTip": "API密钥错误或失效，请检查API密钥！",
        "copyCode": "复制代码",
        "copySuccess": "复制成功",
        "update": "更新",
        "cancel": "取消",
        "delMsgTip": "是否删除此消息？",
        "edit": "编辑",
        "refresh": "刷新",
        "continue": "继续",
        "copy": "复制",
        "del": "删除",
        "downAudio": "下载语音",
        "speech": "朗读",
        "chats": "个会话",
        "delFolderTip": "是否删除此文件夹？",
        "delChatTip": "是否删除此会话？",
        "exportSuccTip": "导出成功！",
        "importSuccTip": "导入成功！",
        "importFailTip": "导入失败，请检查文件格式！",
        "clearChatSuccTip": "清空会话成功！",
        "resetSetSuccTip": "重置设置成功！",
        "clearAllTip": "是否删除所有会话和文件夹？",
        "resetSetTip": "是否还原所有设置为默认值？",
        "hotkeyConflict": "快捷键冲突，请选择其他键位！",
        "customDarkTip": "开始时间和结束时间不能相同！",
        "timeoutTip": "请求超时，请稍后重试！",
        "largeReqTip": "请求内容过大，请删除部分对话或关闭连续对话！",
        "noModelPerTip": "无权使用此模型，请选择其他GPT模型！",
        "apiRateTip": "触发API调用频率限制，请稍后重试！",
        "exceedLimitTip": "API使用超出限额，请检查您的账单！",
        "badGateTip": "网关错误或超时，请稍后重试！",
        "badEndpointTip": "访问接口失败，请检查接口！",
        "clearChatTip": "是否清空此会话？",
        "cantSpeechTip": "当前语音无法合成此消息，请选择其他语音或消息！",
    },
};
const translateElement = (ele, type) => {
    const key = ele.getAttribute("data-i18n-" + type);
    const translation = translations[locale][key];
    if (type === "title") {
        ele.setAttribute("title", translation);
    } else if (type === "place") {
        ele.setAttribute("placeholder", translation);
    } else if (type === "value") {
        ele.setAttribute("value", translation);
    } else {
        ele.textContent = translation;
    }
}
const initLocale = () => {
    document.querySelectorAll("[data-i18n-title]").forEach(ele => {translateElement(ele, "title")});
    document.querySelectorAll("[data-i18n-place]").forEach(ele => {translateElement(ele, "place")});
    document.querySelectorAll("[data-i18n-value]").forEach(ele => {translateElement(ele, "value")});
    document.querySelectorAll("[data-i18n-key]").forEach(ele => {translateElement(ele, "key")});
    document.querySelectorAll("[data-i18n-theme]").forEach(ele => {
        let key = themeMode === 2 ? "autoTheme" : themeMode === 1 ? "lightTheme" : "darkTheme";
        ele.setAttribute("title", translations[locale][key])
    })
    document.querySelectorAll("[data-i18n-window]").forEach(ele => {
        let key = isFull ? "winedWin" : "fullWin";
        ele.setAttribute("title", translations[locale][key])
    })
    document.querySelectorAll("[data-i18n-quota]").forEach(ele => {
        let splitIdx = ele.innerHTML.indexOf(":");
        if (splitIdx === -1) {
            ele.textContent = translations[locale]["thisQuota"];
        } else {
            let validHtml = ele.innerHTML.slice(splitIdx + 2);
            ele.innerHTML = translations[locale]["freeTierTip"] + validHtml;
        }
    })
    document.head.children[3].setAttribute("content", translations[locale]["description"])
};
initLocale();
const changeLocale = () => {
    initLocale();
    document.querySelectorAll("[data-type='chatEdit'],[data-type='folderEdit']").forEach(ele => {
        ele.children[0].textContent = translations[locale]["edit"];
    });
    document.querySelectorAll("[data-type='chatDel'],[data-type='folderDel']").forEach(ele => {
        ele.children[0].textContent = translations[locale]["del"];
    });
    document.querySelectorAll("[data-type='folderAddChat']").forEach(ele => {
        ele.children[0].textContent = translations[locale]["newChat"];
    });
    document.querySelectorAll("[data-id]").forEach(ele => {
        let key = ele.getAttribute("data-id");
        if (key.endsWith("Md")) {
            if (key === "speechMd" || key === "pauseMd" || key === "resumeMd") {
                ele.children[0].textContent = translations[locale][key.slice(0, -2)];
            } else if (key === "refreshMd") {
                ele.setAttribute("title", translations[locale][ele.classList.contains("refreshReq") ? "refresh" : "continue"]);
            } else {
                ele.setAttribute("title", translations[locale][key.slice(0, -2)]);
            }
        }
    });
    document.querySelectorAll(".folderNum").forEach(ele => {
        let num = ele.textContent.match(/\d+/)[0];
        ele.textContent = num + translations[locale]["chats"];
    });
    document.querySelectorAll(".u-mdic-copy-btn").forEach(ele => {
        ele.textContent = translations[locale]["copyCode"];
    })
    document.querySelectorAll(".u-mdic-copy-notify").forEach(ele => {
        ele.textContent = translations[locale]["copySuccess"];
    })
    if (editingIdx !== void 0) {
        document.querySelector("[data-i18n-key='send']").textContent = translations[locale]["update"];
        document.querySelector("[data-i18n-title='clearChat']").setAttribute("title", translations[locale]["cancel"]);
    }
    loadPrompt();
}
