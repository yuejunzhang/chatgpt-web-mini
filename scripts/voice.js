const notyf = new Notyf({
    position: {x: "center", y: "top"},
    types: [
        {
            type: "success",
            background: "#99c959",
            duration: 2000,
        },
        {
            type: "warning",
            background: "#f8b26a",
            duration: 3000
        },
        {
            type: "error",
            background: "#e15b64",
            duration: 3000,
        }
    ]
});
const windowEle = document.getElementsByClassName("chat_window")[0];
const messagesEle = document.getElementsByClassName("messages")[0];
const chatlog = document.getElementById("chatlog");
const stopEle = document.getElementById("stopChat");
const sendBtnEle = document.getElementById("sendbutton");
const clearEle = document.getElementsByClassName("clearConv")[0];
const inputAreaEle = document.getElementById("chatinput");
const settingEle = document.getElementById("setting");
const dialogEle = document.getElementById("setDialog");
const lightEle = document.getElementById("toggleLight");
const setLightEle = document.getElementById("setLight");
const autoThemeEle = document.getElementById("autoDetail");
const systemEle = document.getElementById("systemInput");
const speechServiceEle = document.getElementById("preSetService");
const newChatEle = document.getElementById("newChat");
const folderListEle = document.getElementById("folderList");
const chatListEle = document.getElementById("chatList");
const searchChatEle = document.getElementById("searchChat");
const voiceRecEle = document.getElementById("voiceRecIcon");
const voiceRecSetEle = document.getElementById("voiceRecSetting");
const preEle = document.getElementById("preSetSystem");
let voiceType = 1; // 设置 0: 提问语音，1：回答语音
let voiceRole = []; // 语音
let voiceTestText; // 测试语音文本
let voiceVolume = []; //音量
let voiceRate = []; // 语速
let voicePitch = []; // 音调
let enableContVoice; // 连续朗读
let enableAutoVoice; // 自动朗读
let existVoice = 2; // 3:Azure语音 2:使用edge在线语音, 1:使用本地语音, 0:不支持语音
let azureToken;
let azureTokenTimer;
let azureRegion;
let azureKey;
let azureRole = [];
let azureStyle = [];
const supportSpe = !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
const isSafeEnv = location.hostname.match(/127.|localhost/) || location.protocol.match(/https:|file:/); // https或本地安全环境
const supportRec = !!window.webkitSpeechRecognition && isSafeEnv; // 是否支持语音识别输入
let recing = false;
let autoSendWord; // 自动发送关键词
let autoStopWord; // 自动停止关键词
let autoSendTime; // 自动发送延迟时间
let keepListenMic; // 保持监听麦克风
let autoSendTimer;
let resetRecRes;
let toggleRecEv;
const isAndroid = /\bAndroid\b/i.test(navigator.userAgent);
const isApple = /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent);
const dayMs = 8.64e7;
refreshPage.onclick = () => {
    if (confirmAction(translations[locale]["forceReTip"])) {
        location.href = location.origin + location.pathname + "?" + new Date().getTime()
    }
};
const noLoading = () => {
    return !loading && (!currentResEle || currentResEle.dataset.loading !== "true")
};
inputAreaEle.focus();
const textInputEvent = () => {
    if (noLoading()) {
        if (inputAreaEle.value.trim().length) {
            sendBtnEle.classList.add("activeSendBtn");
        } else {
            sendBtnEle.classList.remove("activeSendBtn");
        }
    }
    inputAreaEle.style.height = "47px";
    inputAreaEle.style.height = inputAreaEle.scrollHeight + "px";
    autoVoiceEle = document.getElementById("enableAutoVoice");
    if (!PreConnected) {
        PreConnection();
        PreConnected=true;
        // 延迟30秒后执行一次指定的代码块
        setTimeout(function() {
            PreConnected=false;
        }, 30000);
    }
};
inputAreaEle.oninput = textInputEvent;
const toggleNavEv = () => {
    document.body.classList.toggle("show-nav");
    if (window.innerWidth > 800) {
        localStorage.setItem("pinNav", document.body.classList.contains("show-nav"))
    }
}
document.body.addEventListener("mousedown", event => {
    if (event.target.className === "toggler") {
        toggleNavEv();
    } else if (event.target.className === "overlay") {
        document.body.classList.remove("show-nav");
    } else if (event.target === document.body) {
        if (window.innerWidth <= 800) {
            document.body.classList.remove("show-nav");
        }
    }
});
const endSetEvent = (ev) => {
    if (!document.getElementById("sysDialog").contains(ev.target)) {
        ev.preventDefault();
        ev.stopPropagation();
        endSet();
    }
}
const endSet = () => {
    document.getElementById("sysMask").style.display = "none";
    document.body.removeEventListener("click", endSetEvent, true);
}
document.getElementById("closeSet").onclick = endSet;
document.getElementById("sysSetting").onclick = () => {
    document.getElementById("sysMask").style.display = "flex";
    checkStorage();
    document.getElementById("sysMask").onmousedown = endSetEvent;
};
const clearAutoSendTimer = () => {
    if (autoSendTimer !== void 0) {
        clearTimeout(autoSendTimer);
        autoSendTimer = void 0;
    }
}
const initRecSetting = () => {
    if (supportRec) {
        noRecTip.style.display = "none";
        yesRec.style.display = "block";
        hotKeyVoiceRec.parentElement.style.display = "block";
        document.getElementById("voiceRec").style.display = "block";
        inputAreaEle.classList.add("message_if_voice");
        let langs = [ // from https://www.google.com/intl/en/chrome/demos/speech.html
            ['中文', ['cmn-Hans-CN', '普通话 (大陆)'],
                ['cmn-Hans-HK', '普通话 (香港)'],
                ['cmn-Hant-TW', '中文 (台灣)'],
                ['yue-Hant-HK', '粵語 (香港)']],
            ['English', ['en-US', 'United States'],
                ['en-GB', 'United Kingdom'],
                ['en-AU', 'Australia'],
                ['en-CA', 'Canada'],
                ['en-IN', 'India'],
                ['en-KE', 'Kenya'],
                ['en-TZ', 'Tanzania'],
                ['en-GH', 'Ghana'],
                ['en-NZ', 'New Zealand'],
                ['en-NG', 'Nigeria'],
                ['en-ZA', 'South Africa'],
                ['en-PH', 'Philippines']]
        ];
        if (locale !== "zh") langs = langs.reverse();
        langs.forEach((lang, i) => {
            select_language.options.add(new Option(lang[0], i));
            selectLangOption.options.add(new Option(lang[0], i))
        });
        const updateCountry = function () {
            selectLangOption.selectedIndex = select_language.selectedIndex = this.selectedIndex;
            select_dialect.innerHTML = "";
            selectDiaOption.innerHTML = "";
            let list = langs[select_language.selectedIndex];
            for (let i = 1; i < list.length; i++) {
                select_dialect.options.add(new Option(list[i][1], list[i][0]));
                selectDiaOption.options.add(new Option(list[i][1], list[i][0]));
            }
            select_dialect.style.visibility = list[1].length == 1 ? "hidden" : "visible";
            selectDiaOption.parentElement.style.visibility = list[1].length == 1 ? "hidden" : "visible";
            localStorage.setItem("voiceRecLang", select_dialect.value);
        };
        let localLangIdx = 0;
        let localDiaIdx = 0;
        let localRecLang = localStorage.getItem("voiceRecLang") || "cmn-Hans-CN";
        if (localRecLang) {
            let localIndex = langs.findIndex(item => {
                let diaIdx = item.findIndex(lang => {return lang instanceof Array && lang[0] === localRecLang});
                if (diaIdx !== -1) {
                    localDiaIdx = diaIdx - 1;
                    return true;
                }
                return false;
            });
            if (localIndex !== -1) localLangIdx = localIndex;
        }
        selectLangOption.onchange = updateCountry;
        select_language.onchange = updateCountry;
        selectDiaOption.onchange = select_dialect.onchange = function () {
            selectDiaOption.selectedIndex = select_dialect.selectedIndex = this.selectedIndex;
            localStorage.setItem("voiceRecLang", select_dialect.value);
        }
        selectLangOption.selectedIndex = select_language.selectedIndex = localLangIdx;
        select_language.dispatchEvent(new Event("change"));
        selectDiaOption.selectedIndex = select_dialect.selectedIndex = localDiaIdx;
        select_dialect.dispatchEvent(new Event("change"));
        let localAutoSendWord = localStorage.getItem("autoVoiceSendWord");
        autoSendWord = autoSendText.value = localAutoSendWord || autoSendText.getAttribute("value") || "";
        autoSendText.onchange = () => {
            autoSendWord = autoSendText.value;
            localStorage.setItem("autoVoiceSendWord", autoSendWord);
        }
        autoSendText.dispatchEvent(new Event("change"));
        let localAutoStopWord = localStorage.getItem("autoVoiceStopWord");
        autoStopWord = autoStopText.value = localAutoStopWord || autoStopText.getAttribute("value") || "";
        autoStopText.onchange = () => {
            autoStopWord = autoStopText.value;
            localStorage.setItem("autoVoiceStopWord", autoStopWord);
        }
        autoStopText.dispatchEvent(new Event("change"));
        let outEle = document.getElementById("autoSendTimeout");
        let localTimeout = localStorage.getItem("autoVoiceSendOut");
        outEle.value = autoSendTime = parseInt(localTimeout || outEle.getAttribute("value"));
        outEle.oninput = () => {
            outEle.style.backgroundSize = (outEle.value - outEle.min) * 100 / (outEle.max - outEle.min) + "% 100%";
            autoSendTime = parseInt(outEle.value);
            localStorage.setItem("autoVoiceSendOut", outEle.value);
        }
        outEle.dispatchEvent(new Event("input"));
        outEle.onchange = () => {
            let hasAutoTimer = !!autoSendTimer;
            clearAutoSendTimer();
            if (hasAutoTimer) setAutoTimer();
        }
        const keepMicEle = document.getElementById("keepListenMic");
        let localKeepMic = localStorage.getItem("keepListenMic");
        keepMicEle.checked = keepListenMic = (localKeepMic || keepMicEle.getAttribute("checked")) === "true";
        keepMicEle.onchange = () => {
            keepListenMic = keepMicEle.checked;
            localStorage.setItem("keepListenMic", keepListenMic);
        }
        keepMicEle.dispatchEvent(new Event("change"));
        let recIns = new webkitSpeechRecognition();
        // prevent some Android bug
        recIns.continuous = !isAndroid;
        recIns.interimResults = true;
        recIns.maxAlternatives = 1;
        let recRes = tempRes = "";
        let preRes, affRes;
        const setAutoTimer = () => {
            if (autoSendTime) {
                autoSendTimer = setTimeout(() => {
                    genFunc();
                    autoSendTimer = void 0;
                }, autoSendTime * 1000);
            }
        }
        const resEvent = (event) => {
            if (typeof (event.results) === "undefined") {
                toggleRecEvent();
                return;
            }
            let isFinal;
            let autoFlag;
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                isFinal = event.results[i].isFinal;
                if (isFinal) {
                    recRes += event.results[i][0].transcript
                    if (autoSendWord) {
                        let idx = recRes.indexOf(autoSendWord);
                        if (idx !== -1) {
                            recRes = recRes.slice(0, idx);
                            autoFlag = 1;
                            break;
                        }
                    }
                    if (autoStopWord) {
                        let idx = recRes.indexOf(autoStopWord);
                        if (idx !== -1) {
                            recRes = recRes.slice(0, idx);
                            autoFlag = 2;
                            break;
                        }
                    }
                }
                else {tempRes = recRes + event.results[i][0].transcript}
            }
            inputAreaEle.value = preRes + (isFinal ? recRes : tempRes) + affRes;
            textInputEvent();
            inputAreaEle.focus();
            inputAreaEle.selectionEnd = inputAreaEle.value.length - affRes.length;
            if (autoFlag) {
                if (autoFlag === 1) genFunc();
                else endEvent(false, false);
            }
            clearAutoSendTimer();
            if (autoFlag !== 1) setAutoTimer();
        };
        resetRecRes = () => {
            preRes = inputAreaEle.value.slice(0, inputAreaEle.selectionStart);
            affRes = inputAreaEle.value.slice(inputAreaEle.selectionEnd);
            recRes = tempRes = "";
        }
        const stopAction = () => {
            clearAutoSendTimer();
            recIns.onresult = null;
            recIns.onerror = null;
            recIns.onend = null;
            voiceRecEle.classList.remove("voiceRecing");
            recing = false;
        }
        const endEvent = (event, flag) => {
            if (flag !== void 0) {
                if (!flag) {
                    recIns.stop();
                    stopAction();
                }
            } else if (event) {
                if (keepListenMic && event.type === "end") {
                    recIns.start();
                    resetRecRes();
                } else {
                    if (event.type === "error") recIns.stop();
                    stopAction();
                }
            }
        };
        const errorEvent = (ev) => {
            if (event.error === "no-speech") {
                notyf.open({
                    type: "warning",
                    message: translations[locale]["noSpeechTip"]
                });
            }
            if (event.error === "audio-capture") {
                notyf.error(translations[locale]["noMicTip"])
                endEvent(ev);
            }
            if (event.error === "not-allowed") {
                notyf.error(translations[locale]["noMicPerTip"])
                endEvent(ev);
            }
        }
        const closeEvent = (ev) => {
            if (voiceRecSetEle.contains(ev.target)) return;
            if (!voiceRecSetEle.contains(ev.target)) {
                voiceRecSetEle.style.display = "none";
                document.removeEventListener("mousedown", closeEvent, true);
                voiceRecEle.classList.remove("voiceLong");
            }
        }
        const longEvent = () => {
            voiceRecSetEle.style.display = "block";
            document.addEventListener("mousedown", closeEvent, true);
        }
        const toggleRecEvent = () => {
            endSpeak();
            voiceRecEle.classList.toggle("voiceRecing");
            if (voiceRecEle.classList.contains("voiceRecing")) {
                try {
                    resetRecRes();
                    recIns.lang = select_dialect.value;
                    recIns.start();
                    recIns.onresult = resEvent;
                    recIns.onerror = errorEvent;
                    recIns.onend = endEvent;
                    recing = true;
                } catch (e) {
                    endEvent(false, false);
                }
            } else {
                endEvent(false, false);
            }
        };
        toggleRecEv = toggleRecEvent;
        let timer;
        const voiceDownEvent = (ev) => {
            ev.preventDefault();
            let i = 0;
            voiceRecEle.classList.add("voiceLong");
            timer = setInterval(() => {
                i += 1;
                if (i >= 3) {
                    clearInterval(timer);
                    timer = void 0;
                    longEvent();
                }
            }, 100)
        };
        const voiceUpEvent = (ev) => {
            ev.preventDefault();
            if (timer !== void 0) {
                toggleRecEvent();
                clearInterval(timer);
                timer = void 0;
                voiceRecEle.classList.remove("voiceLong");
            }
        }
        voiceRecEle.onmousedown = voiceDownEvent;
        voiceRecEle.ontouchstart = voiceDownEvent;
        voiceRecEle.onmouseup = voiceUpEvent;
        voiceRecEle.ontouchend = voiceUpEvent;
    };
};
initRecSetting();
document.querySelector(".sysSwitch").onclick = document.querySelector(".setSwitch").onclick = function (ev) {
    let activeEle = this.getElementsByClassName("activeSwitch")[0];
    if (ev.target !== activeEle) {
        activeEle.classList.remove("activeSwitch");
        ev.target.classList.add("activeSwitch");
        document.getElementById(ev.target.dataset.id).style.display = "block";
        document.getElementById(activeEle.dataset.id).style.display = "none";
    }
};
if (!supportSpe) {
    speechServiceEle.remove(2);
}
const initVoiceVal = () => {
    let localVoiceType = localStorage.getItem("existVoice");
    speechServiceEle.value = existVoice = parseInt(localVoiceType || "2");
}
initVoiceVal();
const clearAzureVoice = () => {
    azureKey = void 0;
    azureRegion = void 0;
    azureRole = [];
    azureStyle = [];
    document.getElementById("azureExtra").style.display = "none";
    azureKeyInput.parentElement.style.display = "none";
    preSetAzureRegion.parentElement.style.display = "none";
    if (azureTokenTimer) {
        clearInterval(azureTokenTimer);
        azureTokenTimer = void 0;
    }
}
speechServiceEle.onchange = () => {
    existVoice = parseInt(speechServiceEle.value);
    localStorage.setItem("existVoice", existVoice);
    toggleVoiceCheck(true);
    if (checkAzureAbort && !checkAzureAbort.signal.aborted) {
        checkAzureAbort.abort();
        checkAzureAbort = void 0;
    }
    if (checkEdgeAbort && !checkEdgeAbort.signal.aborted) {
        checkEdgeAbort.abort();
        checkEdgeAbort = void 0;
    }
    if (existVoice === 3) {
        azureKeyInput.parentElement.style.display = "block";
        preSetAzureRegion.parentElement.style.display = "block";
        loadAzureVoice();
    } else if (existVoice === 2) {
        clearAzureVoice();
        loadEdgeVoice();
    } else if (existVoice === 1) {
        toggleVoiceCheck(false);
        clearAzureVoice();
        loadLocalVoice();
    }
}
let azureVoiceData, edgeVoiceData, systemVoiceData, checkAzureAbort, checkEdgeAbort;
const toggleVoiceCheck = (bool) => {
    checkVoiceLoad.style.display = bool ? "flex" : "none";
    speechDetail.style.display = bool ? "none" : "block";
}
const loadAzureVoice = () => {
    let checking = false;
    const checkAzureFunc = () => {
        if (checking) return;
        if (azureKey) {
            checking = true;
            checkVoiceLoad.classList.add("voiceChecking");
            if (azureTokenTimer) {
                clearInterval(azureTokenTimer);
            }
            checkAzureAbort = new AbortController();
            setTimeout(() => {
                if (checkAzureAbort && !checkAzureAbort.signal.aborted) {
                    checkAzureAbort.abort();
                    checkAzureAbort = void 0;
                }
            }, 15000);
            Promise.all([getAzureToken(checkAzureAbort.signal), getVoiceList(checkAzureAbort.signal)]).then(() => {
                azureTokenTimer = setInterval(() => {
                    getAzureToken();
                }, 540000);
                toggleVoiceCheck(false);
            }).catch(e => {
            }).finally(() => {
                checkVoiceLoad.classList.remove("voiceChecking");
                checking = false;
            })
        }
    };
    checkVoiceLoad.onclick = checkAzureFunc;
    const getAzureToken = (signal) => {
        return new Promise((res, rej) => {
            fetch("https://" + azureRegion + ".api.cognitive.microsoft.com/sts/v1.0/issueToken", {
                signal,
                method: "POST",
                headers: {
                    "Ocp-Apim-Subscription-Key": azureKey
                }
            }).then(response => {
                response.text().then(text => {
                    try {
                        let json = JSON.parse(text);
                        notyf.error(translations[locale]["azureInvalidTip"]);
                        rej();
                    } catch (e) {
                        azureToken = text;
                        res();
                    }
                });
            }).catch(e => {
                rej();
            })
        })
    };
    const getVoiceList = (signal) => {
        return new Promise((res, rej) => {
            if (azureVoiceData) {
                initVoiceSetting(azureVoiceData);
                res();
            } else {
                let localAzureVoiceData = localStorage.getItem(azureRegion + "voiceData");
                if (localAzureVoiceData) {
                    azureVoiceData = JSON.parse(localAzureVoiceData);
                    initVoiceSetting(azureVoiceData);
                    res();
                } else {
                    fetch("https://" + azureRegion + ".tts.speech.microsoft.com/cognitiveservices/voices/list", {
                        signal,
                        headers: {
                            "Ocp-Apim-Subscription-Key": azureKey
                        }
                    }).then(response => {
                        response.json().then(json => {
                            azureVoiceData = json;
                            localStorage.setItem(azureRegion + "voiceData", JSON.stringify(json));
                            initVoiceSetting(json);
                            res();
                        }).catch(e => {
                            notyf.error(translations[locale]["azureInvalidTip"]);
                            rej();
                        })
                    }).catch(e => {
                        rej();
                    })
                }
            }
        })
    };
    let azureRegionEle = document.getElementById("preSetAzureRegion");
    if (!azureRegionEle.options.length) {
        const azureRegions = ['southafricanorth', 'eastasia', 'southeastasia', 'australiaeast', 'centralindia', 'japaneast', 'japanwest', 'koreacentral', 'canadacentral', 'northeurope', 'westeurope', 'francecentral', 'germanywestcentral', 'norwayeast', 'switzerlandnorth', 'switzerlandwest', 'uksouth', 'uaenorth', 'brazilsouth', 'centralus', 'eastus', 'eastus2', 'northcentralus', 'southcentralus', 'westcentralus', 'westus', 'westus2', 'westus3'];
        azureRegions.forEach((region, i) => {
            let option = document.createElement("option");
            option.value = region;
            option.text = region;
            azureRegionEle.options.add(option);
        });
    }
    let localAzureRegion = localStorage.getItem("azureRegion");
    if (localAzureRegion) {
        azureRegion = localAzureRegion;
        azureRegionEle.value = localAzureRegion;
    }
    azureRegionEle.onchange = () => {
        azureRegion = azureRegionEle.value;
        localStorage.setItem("azureRegion", azureRegion);
        toggleVoiceCheck(true);
    }
    azureRegionEle.dispatchEvent(new Event("change"));
    let azureKeyEle = document.getElementById("azureKeyInput");
    let localAzureKey = localStorage.getItem("azureKey");
    if (localAzureKey) {
        azureKey = localAzureKey;
        azureKeyEle.value = localAzureKey;
    }
    azureKeyEle.onchange = () => {
        azureKey = azureKeyEle.value;
        localStorage.setItem("azureKey", azureKey);
        toggleVoiceCheck(true);
    }
    azureKeyEle.dispatchEvent(new Event("change"));
    if (azureKey) {
        checkAzureFunc();
    }
}
const loadEdgeVoice = () => {
    let checking = false;
    const endCheck = () => {
        checkVoiceLoad.classList.remove("voiceChecking");
        checking = false;
    };
    const checkEdgeFunc = () => {
        if (checking) return;
        checking = true;
        checkVoiceLoad.classList.add("voiceChecking");
        if (edgeVoiceData) {
            initVoiceSetting(edgeVoiceData);
            toggleVoiceCheck(false);
            endCheck();
        } else {
            checkEdgeAbort = new AbortController();
            setTimeout(() => {
                if (checkEdgeAbort && !checkEdgeAbort.signal.aborted) {
                    checkEdgeAbort.abort();
                    checkEdgeAbort = void 0;
                }
            }, 10000);
            fetch("https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4", {signal: checkEdgeAbort.signal}).then(response => {
                response.json().then(json => {
                    edgeVoiceData = json;
                    toggleVoiceCheck(false);
                    initVoiceSetting(json);
                    endCheck();
                });
            }).catch(err => {
                endCheck();
            })
        }
    };
    checkEdgeFunc();
    checkVoiceLoad.onclick = checkEdgeFunc;
};
const loadLocalVoice = () => {
    if (systemVoiceData) {
        initVoiceSetting(systemVoiceData);
    } else {
        let initedVoice = false;
        const getLocalVoice = () => {
            let voices = speechSynthesis.getVoices();
            if (voices.length) {
                if (!initedVoice) {
                    initedVoice = true;
                    systemVoiceData = voices;
                    initVoiceSetting(voices);
                }
                return true;
            } else {
                return false;
            }
        }
        let syncExist = getLocalVoice();
        if (!syncExist) {
            if ("onvoiceschanged" in speechSynthesis) {
                speechSynthesis.onvoiceschanged = () => {
                    getLocalVoice();
                }
            } else if (speechSynthesis.addEventListener) {
                speechSynthesis.addEventListener("voiceschanged", () => {
                    getLocalVoice();
                })
            }
            let timeout = 0;
            let timer = setInterval(() => {
                if (getLocalVoice() || timeout > 1000) {
                    if (timeout > 1000) {
                        existVoice = 0;
                    }
                    clearInterval(timer);
                    timer = null;
                }
                timeout += 300;
            }, 300)
        }
    }
};
const initVoiceSetting = (voices) => {
    let isOnline = existVoice >= 2;
    let voicesEle = document.getElementById("preSetSpeech");
    // 支持中文和英文
    voices = isOnline ? voices.filter(item => item.Locale.match(/^(zh-|en-)/)) : voices.filter(item => item.lang.match(/^(zh-|en-)/));
    if (isOnline) {
        voices.map(item => {
            item.name = item.FriendlyName || (`${item.DisplayName} Online (${item.VoiceType}) - ${item.LocaleName}`);
            item.lang = item.Locale;
        })
    }
    voices.sort((a, b) => {
        if (a.lang.slice(0, 2) === b.lang.slice(0, 2)) {
            if (a.lang.slice(0, 2) === "zh") {
                return (a.lang === b.lang) ? 0 : (a.lang > b.lang) ? 1 : -1; // zh-CN 在前
            } else {
                return 0
            }
        }
        return (locale === "zh" ? (a.lang < b.lang) : (a.lang > b.lang)) ? 1 : -1; // 中文UI，则中文"z"在前
    });
    voices.map(item => {
        if (item.name.match(/^(Google |Microsoft )/)) {
            item.displayName = item.name.replace(/^.*? /, "");
        } else {
            item.displayName = item.name;
        }
    });
    voicesEle.innerHTML = "";
    voices.forEach((voice, i) => {
        let option = document.createElement("option");
        option.value = i;
        option.text = voice.displayName;
        voicesEle.options.add(option);
    });
    voicesEle.onchange = () => {
        voiceRole[voiceType] = voices[voicesEle.value];
        localStorage.setItem("voice" + voiceType, voiceRole[voiceType].name);
        if (voiceRole[voiceType].StyleList || voiceRole[voiceType].RolePlayList) {
            document.getElementById("azureExtra").style.display = "block";
            let voiceStyles = voiceRole[voiceType].StyleList;
            let voiceRoles = voiceRole[voiceType].RolePlayList;
            if (voiceRoles) {
                preSetVoiceRole.innerHTML = "";
                voiceRoles.forEach((role, i) => {
                    let option = document.createElement("option");
                    option.value = role;
                    option.text = role;
                    preSetVoiceRole.options.add(option);
                });
                let localRole = localStorage.getItem("azureRole" + voiceType);
                if (localRole && voiceRoles.indexOf(localRole) !== -1) {
                    preSetVoiceRole.value = localRole;
                    azureRole[voiceType] = localRole;
                } else {
                    preSetVoiceRole.selectedIndex = 0;
                    azureRole[voiceType] = voiceRole[0];
                }
                preSetVoiceRole.onchange = () => {
                    azureRole[voiceType] = preSetVoiceRole.value;
                    localStorage.setItem("azureRole" + voiceType, preSetVoiceRole.value);
                }
                preSetVoiceRole.dispatchEvent(new Event("change"));
            } else {
                azureRole[voiceType] = void 0;
                localStorage.removeItem("azureRole" + voiceType);
            }
            preSetVoiceRole.style.display = voiceRoles ? "block" : "none";
            preSetVoiceRole.previousElementSibling.style.display = voiceRoles ? "block" : "none";
            if (voiceStyles) {
                preSetVoiceStyle.innerHTML = "";
                voiceStyles.forEach((style, i) => {
                    let option = document.createElement("option");
                    option.value = style;
                    option.text = style;
                    preSetVoiceStyle.options.add(option);
                });
                let localStyle = localStorage.getItem("azureStyle" + voiceType);
                if (localStyle && voiceStyles.indexOf(localStyle) !== -1) {
                    preSetVoiceStyle.value = localStyle;
                    azureStyle[voiceType] = localStyle;
                } else {
                    preSetVoiceStyle.selectedIndex = 0;
                    azureStyle[voiceType] = voiceStyles[0];
                }
                preSetVoiceStyle.onchange = () => {
                    azureStyle[voiceType] = preSetVoiceStyle.value;
                    localStorage.setItem("azureStyle" + voiceType, preSetVoiceStyle.value)
                }
                preSetVoiceStyle.dispatchEvent(new Event("change"));
            } else {
                azureStyle[voiceType] = void 0;
                localStorage.removeItem("azureStyle" + voiceType);
            }
            preSetVoiceStyle.style.display = voiceStyles ? "block" : "none";
            preSetVoiceStyle.previousElementSibling.style.display = voiceStyles ? "block" : "none";
        } else {
            document.getElementById("azureExtra").style.display = "none";
            azureRole[voiceType] = void 0;
            localStorage.removeItem("azureRole" + voiceType);
            azureStyle[voiceType] = void 0;
            localStorage.removeItem("azureStyle" + voiceType);
        }
    };
    const loadAnother = (type) => {
        type = type ^ 1;
        let localVoice = localStorage.getItem("voice" + type);
        if (localVoice) {
            let localIndex = voices.findIndex(item => {return item.name === localVoice});
            if (localIndex === -1) localIndex = 0;
            voiceRole[type] = voices[localIndex];
        } else {
            voiceRole[type] = voices[0];
        }
        if (existVoice === 3) {
            let localStyle = localStorage.getItem("azureStyle" + type);
            azureStyle[type] = localStyle ? localStyle : void 0;
            let localRole = localStorage.getItem("azureRole" + type);
            azureRole[type] = localRole ? localRole : void 0;
        }
    }
    const voiceChange = () => {
        let localVoice = localStorage.getItem("voice" + voiceType);
        if (localVoice) {
            let localIndex = voices.findIndex(item => {return item.name === localVoice});
            if (localIndex === -1) localIndex = 0;
            voiceRole[voiceType] = voices[localIndex];
            voicesEle.value = localIndex;
        } else {
            voiceRole[voiceType] = voices[0];
        }
        voicesEle.dispatchEvent(new Event("change"));
    }
    voiceChange();
    loadAnother(voiceType);
    let volumeEle = document.getElementById("voiceVolume");
    let localVolume = localStorage.getItem("voiceVolume0");
    voiceVolume[0] = parseFloat(localVolume || volumeEle.getAttribute("value"));
    const voiceVolumeChange = () => {
        let localVolume = localStorage.getItem("voiceVolume" + voiceType);
        volumeEle.value = voiceVolume[voiceType] = parseFloat(localVolume || volumeEle.getAttribute("value"));
        volumeEle.style.backgroundSize = (volumeEle.value - volumeEle.min) * 100 / (volumeEle.max - volumeEle.min) + "% 100%";
    }
    volumeEle.oninput = () => {
        volumeEle.style.backgroundSize = (volumeEle.value - volumeEle.min) * 100 / (volumeEle.max - volumeEle.min) + "% 100%";
        voiceVolume[voiceType] = parseFloat(volumeEle.value);
        localStorage.setItem("voiceVolume" + voiceType, volumeEle.value);
    }
    voiceVolumeChange();
    let rateEle = document.getElementById("voiceRate");
    let localRate = localStorage.getItem("voiceRate0");
    voiceRate[0] = parseFloat(localRate || rateEle.getAttribute("value"));
    const voiceRateChange = () => {
        let localRate = localStorage.getItem("voiceRate" + voiceType);
        rateEle.value = voiceRate[voiceType] = parseFloat(localRate || rateEle.getAttribute("value"));
        rateEle.style.backgroundSize = (rateEle.value - rateEle.min) * 100 / (rateEle.max - rateEle.min) + "% 100%";
    }
    rateEle.oninput = () => {
        rateEle.style.backgroundSize = (rateEle.value - rateEle.min) * 100 / (rateEle.max - rateEle.min) + "% 100%";
        voiceRate[voiceType] = parseFloat(rateEle.value);
        localStorage.setItem("voiceRate" + voiceType, rateEle.value);
    }
    voiceRateChange();
    let pitchEle = document.getElementById("voicePitch");
    let localPitch = localStorage.getItem("voicePitch0");
    voicePitch[0] = parseFloat(localPitch || pitchEle.getAttribute("value"));
    const voicePitchChange = () => {
        let localPitch = localStorage.getItem("voicePitch" + voiceType);
        pitchEle.value = voicePitch[voiceType] = parseFloat(localPitch || pitchEle.getAttribute("value"));
        pitchEle.style.backgroundSize = (pitchEle.value - pitchEle.min) * 100 / (pitchEle.max - pitchEle.min) + "% 100%";
    }
    pitchEle.oninput = () => {
        pitchEle.style.backgroundSize = (pitchEle.value - pitchEle.min) * 100 / (pitchEle.max - pitchEle.min) + "% 100%";
        voicePitch[voiceType] = parseFloat(pitchEle.value);
        localStorage.setItem("voicePitch" + voiceType, pitchEle.value);
    }
    voicePitchChange();
    document.getElementById("voiceTypes").onclick = (ev) => {
        let type = ev.target.dataset.type;
        if (type !== void 0) {
            type = parseInt(type);
            if (type != voiceType) {
                voiceType = type;
                ev.target.classList.add("selVoiceType");
                ev.target.parentElement.children[type ^ 1].classList.remove("selVoiceType");
                voiceChange();
                voiceVolumeChange();
                voiceRateChange();
                voicePitchChange();
            }
        };
    };
    const voiceTestEle = document.getElementById("testVoiceText");
    let localTestVoice = localStorage.getItem("voiceTestText");
    voiceTestText = voiceTestEle.value = localTestVoice || voiceTestEle.getAttribute("value");
    voiceTestEle.oninput = () => {
        voiceTestText = voiceTestEle.value;
        localStorage.setItem("voiceTestText", voiceTestText);
    }
    const contVoiceEle = document.getElementById("enableContVoice");
    let localCont = localStorage.getItem("enableContVoice");
    contVoiceEle.checked = enableContVoice = (localCont || contVoiceEle.getAttribute("checked")) === "true";
    contVoiceEle.onchange = () => {
        enableContVoice = contVoiceEle.checked;
        localStorage.setItem("enableContVoice", enableContVoice);
    }
    contVoiceEle.dispatchEvent(new Event("change"));
    const autoVoiceEle = document.getElementById("enableAutoVoice");
    let localAuto = localStorage.getItem("enableAutoVoice");
    autoVoiceEle.checked = enableAutoVoice = (localAuto || autoVoiceEle.getAttribute("checked")) === "true";
    autoVoiceEle.onchange = () => {
        enableAutoVoice = autoVoiceEle.checked;
        localStorage.setItem("enableAutoVoice", enableAutoVoice);
    }
    autoVoiceEle.dispatchEvent(new Event("change"));
};
speechServiceEle.dispatchEvent(new Event("change"));
