const API_URL = "v1/chat/completions";
let loading = false;
let presetRoleData = {
    "default": translations[locale]["defaultText"],
    "normal": translations[locale]["assistantText"],
    "Programmer": translations[locale]["ProgrammerText"],
    "emoji": translations[locale]["emojiText"],
    "image": translations[locale]["imageText"]
};
let modelVersion; // 模型版本
let apiHost; // api反代地址
let apiSelects = []; // api地址列表
let customAPIKey; // 自定义apiKey
let systemRole; // 自定义系统角色
let roleNature; // 角色性格
let roleTemp; // 回答质量
let convWidth = []; // 会话宽度，0:窗口宽度，1:全屏宽度
let textSpeed; // 打字机速度，越小越快
let contLen; // 连续会话长度，默认25，对话包含25条上下文信息。设置为0即关闭连续会话
let enableLongReply; // 是否开启长回复，默认关闭，开启可能导致api费用增加。
let longReplyFlag;
let voiceIns; // Audio or SpeechSynthesisUtterance
const supportMSE = !!window.MediaSource; // 是否支持MSE（除了ios应该都支持）
let voiceMIME = "audio/mpeg";
let userAvatar; // 用户头像
let customDarkOut;
const isContentBottom = () => messagesEle.scrollHeight - messagesEle.scrollTop - messagesEle.clientHeight < 128;
const scrollToBottom = () => {
    if (isContentBottom()) {
        messagesEle.scrollTo(0, messagesEle.scrollHeight)
    }
}
const scrollToBottomLoad = (ele) => {
    if (messagesEle.scrollHeight - messagesEle.scrollTop - messagesEle.clientHeight < ele.clientHeight + 128) {
        messagesEle.scrollTo(0, messagesEle.scrollHeight)
    }
}
const forceRepaint = (ele) => {
    ele.style.display = "none";
    ele.offsetHeight;
    ele.style.display = null;
}
const escapeTextarea = document.createElement("textarea");
const getEscape = str => {
    escapeTextarea.textContent = str;
    return escapeTextarea.innerHTML;
}
const getUnescape = html => {
    escapeTextarea.innerHTML = html;
    return escapeTextarea.textContent;
}
const formatDate = date => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
}
const checkBill = async () => {
    let headers = {"Content-Type": "application/json"};
    if (customAPIKey) headers["Authorization"] = "Bearer " + customAPIKey;
    let subCtrl = new AbortController();
    setTimeout(() => {
        subCtrl.abort();
    }, 20000);
    let subRes;
    try {
        subRes = await fetch(apiHost + "v1/dashboard/billing/subscription", {
            headers,
            signal: subCtrl.signal
        });
        if (subRes.status !== 200) return;
    } catch (e) {
        return;
    }
    const subData = await subRes.json();
    const totalQuota = subData.hard_limit_usd;
    const isSubsrcibed = subData.has_payment_method;
    const urlUsage = apiHost + "v1/dashboard/billing/usage?";
    let useCtrl = new AbortController();
    const nowDate = new Date(new Date().getTime() + dayMs);
    let usedData;
    let expired;
    setTimeout(() => {
        useCtrl.abort();
    }, 20000);
    if (isSubsrcibed) {
        const subDate = new Date();
        subDate.setDate(1);
        try {
            const useRes = await fetch(urlUsage + `start_date=${formatDate(subDate)}&end_date=${formatDate(nowDate)}`, {
                headers,
                signal: useCtrl.signal
            });
            const useJson = await useRes.json();
            usedData = useJson.total_usage / 100;
        } catch (e) {
            return;
        }
    } else {
        let urls = [];
        const expireTime = subData.access_until * 1000;
        expired = new Date(expireTime);
        const startDate = new Date(expireTime - 128 * dayMs);
        const midDate = new Date(expireTime - 64 * dayMs);
        const endDate = new Date(expireTime + dayMs);
        if (nowDate < midDate) {
            urls.push(`start_date=${formatDate(startDate)}&end_date=${formatDate(nowDate)}`);
        } else if (nowDate < endDate) {
            urls.push(`start_date=${formatDate(startDate)}&end_date=${formatDate(midDate)}`);
            if (formatDate(nowDate) !== formatDate(midDate)) {
                urls.push(`start_date=${formatDate(midDate)}&end_date=${formatDate(nowDate)}`);
            }
        } else {
            urls.push(`start_date=${formatDate(startDate)}&end_date=${formatDate(midDate)}`);
            urls.push(`start_date=${formatDate(midDate)}&end_date=${formatDate(endDate)}`);
        }
        try {
            const uses = await Promise.all(urls.map(async url => {
                return new Promise((res, rej) => {
                    fetch(urlUsage + url, {
                        headers,
                        signal: useCtrl.signal
                    }).then(response => {
                        response.json().then(json => {
                            if (json.total_usage !== void 0) res(json.total_usage);
                            else rej();
                        });
                    }).catch(() => {
                        rej();
                    })
                })
            }));
            usedData = uses.reduce((prev, curr) => prev + curr, 0) / 100;
        } catch (e) {
            return;
        }
    }
    if (usedData > totalQuota) usedData = totalQuota;
    return [totalQuota, usedData, isSubsrcibed, expired];
}
let checkingBill = false;
checkBillBtn.onclick = async () => {
    if (checkingBill) return;
    checkingBill = true;
    checkBillBtn.className = "loading";
    quotaContent.style.display = "none";
    try {
        let res = await checkBill();
        if (!res) throw new Error("API error");
        let [total, used, isSub, exp] = res;
        usedQuotaBar.style.width = (used / total * 100).toFixed(2) + "%";
        usedQuotaBar.parentElement.classList.remove("expiredBar");
        usedQuota.textContent = "$" + used.toFixed(2);
        let remain = total - used;
        availableQuota.textContent = "$" + Math.floor(remain * 100) / 100;
        if (isSub) {
            quotaTitle.textContent = translations[locale]["thisQuota"];
        } else {
            let isExpired = new Date() > exp;
            if (isExpired) usedQuotaBar.parentElement.classList.add("expiredBar");
            let accessDate = formatDate(exp);
            quotaTitle.innerHTML = translations[locale]["freeTierTip"] + `<span style="color: ${isExpired ? "#e15b64" : "#99c959"} ">${accessDate}</span>`;
        }
        quotaContent.style.display = "block";
    } catch (e) {
        notyf.error(translations[locale]["errorAiKeyTip"]);
    }
    checkingBill = false;
    checkBillBtn.className = "loaded";
}
const checkStorage = () => {
    let used = 0;
    for (let key in localStorage) {
        localStorage.hasOwnProperty(key) && (used += localStorage[key].length)
    }
    let remain = 5242880 - used;
    usedStorageBar.style.width = (used / 5242880 * 100).toFixed(2) + "%";
    let usedMBs = used / 1048576;
    usedStorage.textContent = (usedMBs < 1 ? usedMBs.toPrecision(2) : usedMBs.toFixed(2)) + "MB";
    availableStorage.textContent = Math.floor(remain / 1048576 * 100) / 100 + "MB";
};
const md = markdownit({
    linkify: true, // 识别链接
    highlight: function (str, lang) { // markdown高亮
        try {
            return hljs.highlightAuto(str).value;
        } catch (e) { }
        return ""; // use external default escaping
    }
});
md.use(texmath, {engine: katex, delimiters: "dollars", katexOptions: {macros: {"\\RR": "\\mathbb{R}"}}})
    .use(markdownitLinkAttributes, {attrs: {target: "_blank", rel: "noopener"}});
const codeUtils = {
    getCodeLang(str = "") {
        const res = str.match(/ class="language-(.*?)"/);
        return (res && res[1]) || "";
    },
    getFragment(str = "") {
        return str ? `<span class="u-mdic-copy-code_lang">${str}</span>` : "";
    },
};
const getCodeLangFragment = (oriStr = "") => {
    return codeUtils.getFragment(codeUtils.getCodeLang(oriStr));
};
const copyClickCode = (ele) => {
    const input = document.createElement("textarea");
    input.value = ele.parentElement.previousElementSibling.textContent;
    const nDom = ele.previousElementSibling;
    const nDelay = ele.dataset.mdicNotifyDelay;
    const cDom = nDom.previousElementSibling;
    document.body.appendChild(input);
    input.select();
    input.setSelectionRange(0, input.value.length);
    document.execCommand("copy");
    document.body.removeChild(input);
    if (nDom.style.display === "none") {
        nDom.style.display = "block";
        cDom && (cDom.style.display = "none");
        setTimeout(() => {
            nDom.style.display = "none";
            cDom && (cDom.style.display = "block");
        }, nDelay);
    }
};
const copyClickMd = (idx) => {
    const input = document.createElement("textarea");
    input.value = data[idx].content;
    document.body.appendChild(input);
    input.select();
    input.setSelectionRange(0, input.value.length);
    document.execCommand("copy");
    document.body.removeChild(input);
}
const enhanceCode = (render, options = {}) => (...args) => {
    /* args = [tokens, idx, options, env, slf] */
    const {
        btnText = translations[locale]["copyCode"], // button text
        successText = translations[locale]["copySuccess"], // copy-success text
        successTextDelay = 2000, // successText show time [ms]
        showCodeLanguage = true, // false | show code language
    } = options;
    const [tokens = {}, idx = 0] = args;
    const originResult = render.apply(this, args);
    const langFrag = showCodeLanguage ? getCodeLangFragment(originResult) : "";
    const tpls = [
        '<div class="m-mdic-copy-wrapper">',
        `${langFrag}`,
        `<div class="u-mdic-copy-notify" style="display:none;">${successText}</div>`,
        '<button ',
        'class="u-mdic-copy-btn j-mdic-copy-btn" ',
        `data-mdic-notify-delay="${successTextDelay}" `,
        `onclick="copyClickCode(this)">${btnText}</button>`,
        '</div>',
    ];
    return originResult.replace("</pre>", `${tpls.join("")}</pre>`);
};
md.renderer.rules.code_block = enhanceCode(md.renderer.rules.code_block);
md.renderer.rules.fence = enhanceCode(md.renderer.rules.fence);
md.renderer.rules.image = function (tokens, idx, options, env, slf) {
    let token = tokens[idx];
    token.attrs[token.attrIndex("alt")][1] = slf.renderInlineAsText(token.children, options, env);
    token.attrSet("onload", "scrollToBottomLoad(this);this.removeAttribute('onload');this.removeAttribute('onerror')");
    token.attrSet("onerror", "scrollToBottomLoad(this);this.removeAttribute('onload');this.removeAttribute('onerror')");
    return slf.renderToken(tokens, idx, options)
}
let currentVoiceIdx;
let editingIdx;
let originText;
const resumeSend = () => {
    if (editingIdx !== void 0) {
        chatlog.children[systemRole ? editingIdx - 1 : editingIdx].classList.remove("showEditReq");
    }
    sendBtnEle.children[0].textContent = translations[locale]["send"];
    inputAreaEle.value = originText;
    clearEle.title = translations[locale]["clearChat"];
    clearEle.classList.remove("closeConv");
    originText = void 0;
    editingIdx = void 0;
}
const mdOptionEvent = function (ev) {
    let id = ev.target.dataset.id;
    if (id) {
        let parent = ev.target.parentElement;
        let idxEle = parent.parentElement;
        let idx = Array.prototype.indexOf.call(chatlog.children, this.parentElement);
        if (id === "voiceBtn" || id === "speechMd" || id === "pauseMd" || id === "resumeMd") {
            let classList = parent.dataset.id === "voiceBtn" ? parent.classList : ev.target.classList;
            if (classList.contains("readyVoice")) {
                if (chatlog.children[idx].dataset.loading !== "true") {
                    idx = systemRole ? idx + 1 : idx;
                    speechEvent(idx);
                }
            } else if (classList.contains("pauseVoice")) {
                if (voiceIns) {
                    if (voiceIns instanceof Audio) voiceIns.pause();
                    else {
                        if (supportSpe) speechSynthesis.pause();
                        classList.remove("readyVoice");
                        classList.remove("pauseVoice");
                        classList.add("resumeVoice");
                    }
                }
            } else {
                if (voiceIns) {
                    if (voiceIns instanceof Audio) voiceIns.play();
                    else {
                        if (supportSpe) speechSynthesis.resume();
                        classList.remove("readyVoice");
                        classList.remove("resumeVoice");
                        classList.add("pauseVoice");
                    }
                }
            }
        } else if (id === "editMd") {
            let reqEle = chatlog.children[idx];
            idx = systemRole ? idx + 1 : idx;
            if (editingIdx === idx) return;
            if (editingIdx !== void 0) {
                chatListEle.children[systemRole ? editingIdx - 1 : editingIdx].classList.remove("showEditReq");
            }
            reqEle.classList.add("showEditReq");
            editingIdx = idx;
            originText = inputAreaEle.value;
            inputAreaEle.value = data[idx].content;
            inputAreaEle.dispatchEvent(new Event("input"));
            inputAreaEle.focus();
            sendBtnEle.children[0].textContent = translations[locale]["update"];
            clearEle.title = translations[locale]["cancel"];
            clearEle.classList.add("closeConv");
        } else if (id === "refreshMd") {
            if(modelVersion=="Claude-2"){
                chatlog.children[idx].children[0].className ="ClaudeAvatar";
                chatlog.children[idx].children[0].innerHTML =  `<svg width="22" height="22"><use xlink:href="#ClaudeAiIcon"></use></svg>`;    
            }
            else{
                chatlog.children[idx].children[0].className =((modelVersion && modelVersion.startsWith("gpt-4")) ? "gpt4Avatar" : "gpt3Avatar");
                chatlog.children[idx].children[0].innerHTML =  `<svg width="22" height="22"><use xlink:href="#aiIcon"></use></svg>`;
            } 
            if (noLoading()) {
                if (ev.target.classList.contains("refreshReq")) {
                    chatlog.children[idx].children[1].innerHTML = "<p class='cursorCls'><br /></p>";
                    chatlog.children[idx].dataset.loading = true;
                    idx = systemRole ? idx + 1 : idx;
                    data[idx].content = "";
                    if (idx === currentVoiceIdx) {endSpeak()};
                    loadAction(true);
                    refreshIdx = idx;
                    streamGen();
                } else {
                    chatlog.children[idx].dataset.loading = true;
                    idx = systemRole ? idx + 1 : idx;
                    progressData = data[idx].content;
                    loadAction(true);
                    refreshIdx = idx;
                    streamGen(true);
                }
            }
        } else if (id === "copyMd") {
            idx = systemRole ? idx + 1 : idx;
            copyClickMd(idx);
            notyf.success(translations[locale]["copySuccess"]);
        } else if (id === "delMd") {
            if (noLoading()) {
                if (confirmAction(translations[locale]["delMsgTip"])) {
                    chatlog.removeChild(chatlog.children[idx]);
                    idx = systemRole ? idx + 1 : idx;
                    let firstIdx = data.findIndex(item => {return item.role === "assistant"});
                    if (currentVoiceIdx !== void 0) {
                        if (currentVoiceIdx === idx) {endSpeak()}
                        else if (currentVoiceIdx > idx) {currentVoiceIdx--}
                    }
                    if (editingIdx !== void 0) {
                        if (editingIdx === idx) {resumeSend()}
                        else if (editingIdx > idx) {editingIdx--}
                    }
                    data.splice(idx, 1);
                    if (firstIdx === idx) updateChatPre();
                    updateChats();
                }
            }
        } else if (id === "downAudioMd") {
            if (chatlog.children[idx].dataset.loading !== "true") {
                idx = systemRole ? idx + 1 : idx;
                downloadAudio(idx);
            }
        }
    }
}
const formatMdEle = (ele, model) => {
    let avatar = document.createElement("div");
        avatar.className = "chatAvatar";
    let realMd = document.createElement("div");
    if (ele.className === "response") {
        if(model=="Claude-2"){
            avatar.classList.add("ClaudeAvatar");
            avatar.innerHTML =  `<svg width="22" height="22"><use xlink:href="#ClaudeAiIcon"></use></svg>`;    
        }
        else{
            avatar.classList.add((model && model.startsWith("gpt-4")) ? "gpt4Avatar" : "gpt3Avatar");
            avatar.innerHTML =  `<svg width="22" height="22"><use xlink:href="#aiIcon"></use></svg>`;
        } 
        ele.appendChild(avatar);
        realMd.className =  "markdown-body";
        ele.appendChild(realMd);
    }
    if (ele.className === "request") {
        realMd.className =  "requestBody";
        ele.appendChild(realMd);
        avatar.innerHTML = `<img src="${userAvatar}"/>`;
        ele.appendChild(avatar);
    }

    let mdOption = document.createElement("div");
    mdOption.className = "mdOption";
    ele.appendChild(mdOption);
    // logwidth=document.getElementById('chatlog').clientWidth;
    let optionWidth = existVoice >= 2 ? 140 : 105;
    // logwidth=logwidth/2-10;
    mdOption.innerHTML += `<div class="optionItems" style="width:${optionWidth}px;left:-${optionWidth/2}px">`
        + (ele.className === "request" ? `<div data-id="editMd" class="optionItem" title="${translations[locale]["edit"]}">
        <svg width="18" height="18"><use xlink:href="#chatEditIcon" /></svg>
        </div>` : `<div data-id="refreshMd" class="refreshReq optionItem" title="${translations[locale]["refresh"]}">
        <svg width="16" height="16" ><use xlink:href="#refreshIcon" /></svg>
        <svg width="16" height="16" ><use xlink:href="#halfRefIcon" /></svg>
        </div>`) +
        `<div data-id="copyMd" class="optionItem" title="${translations[locale]["copy"]}">
        <svg width="20" height="20"><use xlink:href="#copyIcon" /></svg></div>
        <div data-id="delMd" class="optionItem" title="${translations[locale]["del"]}">
        <svg width="20" height="20"><use xlink:href="#delIcon" /></svg></div>` + 
    (existVoice >= 2 ? 
        `<div data-id="downAudioMd" class="optionItem" title="${translations[locale]["downAudio"]}">
        <svg width="20" height="20"><use xlink:href="#downAudioIcon" /></svg></div>` : "") +
    (existVoice ?
        `<div class="optionItem readyVoice" data-id="voiceBtn">
        <svg width="20" height="20" role="img" data-id="speechMd"><title>${translations[locale]["speech"]}</title><use xlink:href="#readyVoiceIcon" /></svg>
        <svg width="20" height="20" role="img" data-id="pauseMd"><title>${translations[locale]["pause"]}</title><use xlink:href="#pauseVoiceIcon" /></svg>
        <svg width="20" height="20" role="img" data-id="resumeMd"><title>${translations[locale]["resume"]}</title><use xlink:href="#resumeVoiceIcon" /></svg>
        </div>`:"")+`</div>` 
    // if (existVoice) {
    //     mdOption.innerHTML += `<div class="voiceCls readyVoice" data-id="voiceBtn">
    //     <svg width="20" height="20" role="img" data-id="speechMd"><title>${translations[locale]["speech"]}</title><use xlink:href="#readyVoiceIcon" /></svg>
    //     <svg width="20" height="20" role="img" data-id="pauseMd"><title>${translations[locale]["pause"]}</title><use xlink:href="#pauseVoiceIcon" /></svg>
    //     <svg width="20" height="20" role="img" data-id="resumeMd"><title>${translations[locale]["resume"]}</title><use xlink:href="#resumeVoiceIcon" /></svg>
    //     </div>`
    // }
 
    mdOption.onclick = mdOptionEvent;
}
let allListEle = chatListEle.parentElement;
let folderData = [];
let chatsData = [];
let chatIdxs = [];
let searchIdxs = [];
let activeChatIdx = 0;
let activeChatEle;
let operateChatIdx, operateFolderIdx;
let dragLi, dragType, dragIdx;
let mobileDragOut;
const mobileDragStartEV = function (ev) {
    if (mobileDragOut !== void 0) {
        clearTimeout(mobileDragOut);
        mobileDragOut = void 0;
    }
    mobileDragOut = setTimeout(() => {
        this.setAttribute("draggable", "true");
        this.dispatchEvent(ev);
    }, 200);
};
if (isMobile) {
    let stopDragOut = () => {
        if (mobileDragOut !== void 0) {
            clearTimeout(mobileDragOut);
            mobileDragOut = void 0;
        }
    };
    let stopDrag = () => {
        stopDragOut();
        document.querySelectorAll("[draggable=true]").forEach(ele => {
            ele.setAttribute("draggable", "false");
        })
    };
    document.body.addEventListener("touchmove", stopDragOut);
    document.body.addEventListener("touchend", stopDrag);
    document.body.addEventListener("touchcancel", stopDrag);
};
const delDragIdx = () => {
    let chatIdx = chatIdxs.indexOf(dragIdx);
    if (chatIdx !== -1) {
        chatIdxs.splice(chatIdx, 1);
    } else {
        folderData.forEach((item, i) => {
            let inIdx = item.idxs.indexOf(dragIdx);
            if (inIdx !== -1) {
                item.idxs.splice(inIdx, 1);
                updateFolder(i);
            }
        })
    }
}
const updateFolder = (idx) => {
    let folderEle = folderListEle.children[idx];
    let childLen = folderData[idx].idxs.length;
    folderEle.children[0].children[1].children[1].textContent = childLen + translations[locale]["chats"];
    if (childLen) {folderEle.classList.add("expandFolder")}
    else {folderEle.classList.remove("expandFolder")}
}
folderListEle.ondragenter = chatListEle.ondragenter = function (ev) {
    ev.preventDefault();
    if (ev.target === dragLi) return;
    allListEle.querySelectorAll(".dragingChat").forEach(ele => {
        ele.classList.remove("dragingChat");
    })
    if (dragType === "chat") {
        if (this === chatListEle) {
            this.classList.add("dragingChat");
            let dragindex = Array.prototype.indexOf.call(chatListEle.children, dragLi);
            let targetindex = Array.prototype.indexOf.call(chatListEle.children, ev.target);
            delDragIdx();
            if (targetindex !== -1) {
                chatIdxs.splice(targetindex, 0, dragIdx);
                if (dragindex === -1 || dragindex >= targetindex) {
                    chatListEle.insertBefore(dragLi, ev.target);
                } else {
                    chatListEle.insertBefore(dragLi, ev.target.nextElementSibling);
                }
            } else {
                chatIdxs.push(dragIdx);
                chatListEle.appendChild(dragLi);
            }
        } else if (this === folderListEle) {
            let folderIdx;
            if (ev.target.classList.contains("headLi")) {
                ev.target.parentElement.classList.add("dragingChat");
                ev.target.nextElementSibling.appendChild(dragLi);
                delDragIdx();
                folderIdx = Array.prototype.indexOf.call(folderListEle.children, ev.target.parentElement);
                folderData[folderIdx].idxs.push(dragIdx);
                updateFolder(folderIdx);
            } else if (ev.target.classList.contains("chatLi")) {
                ev.target.parentElement.parentElement.classList.add("dragingChat");
                let parent = ev.target.parentElement;
                delDragIdx();
                folderIdx = Array.prototype.indexOf.call(folderListEle.children, parent.parentElement);
                let dragindex = Array.prototype.indexOf.call(parent.children, dragLi);
                let targetindex = Array.prototype.indexOf.call(parent.children, ev.target);
                if (dragindex !== -1) {
                    folderData[folderIdx].idxs.splice(targetindex, 0, dragIdx);
                    if (dragindex < targetindex) {
                        parent.insertBefore(dragLi, ev.target.nextElementSibling);
                    } else {
                        parent.insertBefore(dragLi, ev.target);
                    }
                } else {
                    folderData[folderIdx].idxs.push(dragIdx);
                    parent.appendChild(dragLi);
                }
                updateFolder(folderIdx);
            }
        }
        updateChatIdxs();
    } else if (dragType === "folder") {
        if (this === folderListEle) {
            let dragindex = Array.prototype.indexOf.call(folderListEle.children, dragLi);
            let folderIdx = Array.prototype.findIndex.call(folderListEle.children, (item) => {
                return item.contains(ev.target);
            })
            folderListEle.children[folderIdx].classList.remove("expandFolder");
            let folderEle = folderListEle.children[folderIdx];
            let data = folderData.splice(dragindex, 1)[0];
            folderData.splice(folderIdx, 0, data);
            if (dragindex === -1 || dragindex >= folderIdx) {
                folderListEle.insertBefore(dragLi, folderEle);
            } else {
                folderListEle.insertBefore(dragLi, folderEle.nextElementSibling);
            }
            updateChatIdxs();
        }
    }
}
folderListEle.ondragover = chatListEle.ondragover = (ev) => {
    ev.preventDefault();
}
folderListEle.ondragend = chatListEle.ondragend = (ev) => {
    document.getElementsByClassName("dragingLi")[0].classList.remove("dragingLi");
    allListEle.querySelectorAll(".dragingChat").forEach(ele => {
        ele.classList.remove("dragingChat");
    })
    dragType = dragIdx = dragLi = void 0;
}
const chatDragStartEv = function (ev) {
    ev.stopPropagation();
    dragLi = this;
    dragLi.classList.add("dragingLi");
    dragType = "chat";
    if (chatListEle.contains(this)) {
        let idx = Array.prototype.indexOf.call(chatListEle.children, this);
        dragIdx = chatIdxs[idx];
    } else if (folderListEle.contains(this)) {
        let folderIdx = Array.prototype.indexOf.call(folderListEle.children, this.parentElement.parentElement);
        let inFolderIdx = Array.prototype.indexOf.call(this.parentElement.children, this);
        dragIdx = folderData[folderIdx].idxs[inFolderIdx];
    }
}
const extraFolderActive = (folderIdx) => {
    let folderNewIdx = -1;
    for (let i = folderIdx - 1; i >= 0; i--) {
        if (folderData[i].idxs.length) {
            folderNewIdx = i;
        }
    }
    if (folderNewIdx === -1) {
        for (let i = folderIdx + 1; i < folderData.length; i++) {
            if (folderData[i].idxs.length) folderNewIdx = i;
        }
    }
    if (folderNewIdx !== -1) {
        activeChatIdx = folderData[folderNewIdx].idxs[0];
    } else if (chatIdxs.length) {
        activeChatIdx = chatIdxs[0];
    } else {
        activeChatIdx = -1;
    }
}
const delFolder = (folderIdx, ele) => {
    if (confirmAction(translations[locale]["delFolderTip"])) {
        let delData = folderData[folderIdx];
        let idxs = delData.idxs.sort();
        ele.parentElement.remove();
        if (idxs.indexOf(activeChatIdx) !== -1) {
            endAll();
            extraFolderActive(folderIdx);
        }
        folderData.splice(folderIdx, 1);
        for (let i = idxs.length - 1; i >= 0; i--) {
            chatsData.splice(idxs[i], 1);
        }
        folderData.forEach(item => {
            if (item.idxs.length) {
                item.idxs.forEach((i, ix) => {
                    let len = idxs.filter(j => {return i > j}).length;
                    if (len) {
                        item.idxs[ix] = i - len;
                    }
                })
            }
        })
        chatIdxs.forEach((item, ix) => {
            let len = idxs.filter(j => {return item > j}).length;
            if (len) chatIdxs[ix] = item - len;
        })
        let len = idxs.filter(j => {return activeChatIdx > j}).length;
        if (len) activeChatIdx -= len;
        if (activeChatIdx === -1) {
            addNewChat();
            activeChatIdx = 0;
            chatEleAdd(activeChatIdx);
        }
        updateChats();
        activeChat();
    }
}
const folderAddChat = (folderIdx, headEle) => {
    endAll();
    let chat = {name: translations[locale]["newChatName"], data: []};
    chatsData.push(chat);
    activeChatIdx = chatsData.length - 1;
    folderData[folderIdx].idxs.push(activeChatIdx);
    let ele = chatEleAdd(activeChatIdx, false)
    headEle.nextElementSibling.appendChild(ele);
    updateFolder(folderIdx);
    updateChats();
    activeChat(ele);
}
const folderEleEvent = function (ev) {
    ev.preventDefault();
    ev.stopPropagation();
    let parent = this.parentElement;
    let idx = Array.prototype.indexOf.call(folderListEle.children, parent);
    if (ev.target.className === "headLi") {
        parent.classList.toggle("expandFolder");
        if (folderData[idx].idxs.indexOf(activeChatIdx) !== -1) {
            if (parent.classList.contains("expandFolder")) {
                parent.classList.remove("activeFolder");
            } else {
                parent.classList.add("activeFolder");
            }
        }
    } else if (ev.target.dataset.type === "folderAddChat") {
        folderAddChat(idx, this);
    } else if (ev.target.dataset.type === "folderEdit") {
        toEditName(idx, this, 0);
    } else if (ev.target.dataset.type === "folderDel") {
        delFolder(idx, this);
    }
}
const folderDragStartEv = function (ev) {
    dragLi = this;
    dragLi.classList.add("dragingLi");
    dragType = "folder";
    dragIdx = Array.prototype.indexOf.call(folderListEle.children, this);
}
const folderEleAdd = (idx, push = true) => {
    let folder = folderData[idx];
    let folderEle = document.createElement("div");
    folderEle.className = "folderLi";
    if (!isMobile) folderEle.setAttribute("draggable", "true");
    else folderEle.ontouchstart = mobileDragStartEV;
    let headEle = document.createElement("div");
    headEle.className = "headLi";
    headEle.innerHTML = `<svg width="24" height="24"><use xlink:href="#expandFolderIcon" /></svg>
        <div class="folderInfo">
            <div class="folderName"></div>
            <div class="folderNum"></div>
        </div>
        <div class="folderOption">
            <svg data-type="folderAddChat" width="24" height="24" role="img"><title>${translations[locale]["newChat"]}</title><use xlink:href="#addIcon" /></svg>
            <svg data-type="folderEdit" width="24" height="24" role="img"><title>${translations[locale]["edit"]}</title><use xlink:href="#chatEditIcon" /></svg>
            <svg data-type="folderDel" width="24" height="24" role="img"><title>${translations[locale]["del"]}</title><use xlink:href="#delIcon" /></svg>
        </div>`
    headEle.children[1].children[0].textContent = folder.name;
    headEle.children[1].children[1].textContent = folder.idxs.length + translations[locale]["chats"];
    folderEle.appendChild(headEle);
    folderEle.ondragstart = folderDragStartEv;
    headEle.onclick = folderEleEvent;
    let chatsEle = document.createElement("div");
    chatsEle.className = "chatsInFolder";
    for (let i = 0; i < folder.idxs.length; i++) {
        chatsEle.appendChild(chatEleAdd(folder.idxs[i], false));
    }
    folderEle.appendChild(chatsEle);
    if (push) {folderListEle.appendChild(folderEle)}
    else {folderListEle.insertBefore(folderEle, folderListEle.firstChild)}
}
document.getElementById("newFolder").onclick = function () {
    folderData.unshift({name: translations[locale]["newFolderName"], idxs: []});
    folderEleAdd(0, false);
    updateChatIdxs();
    folderListEle.parentElement.scrollTop = 0;
};
const initChatEle = (index, chatEle) => {
    chatEle.children[1].children[0].textContent = chatsData[index].name;
    let chatPreview = "";
    if (chatsData[index].data && chatsData[index].data.length) {
        let first = chatsData[index].data.find(item => {return item.role === "assistant"});
        if (first) {chatPreview = first.content.slice(0, 30)}
    }
    chatEle.children[1].children[1].textContent = chatPreview;
};
const chatEleAdd = (idx, appendChat = true) => {
    let chat = chatsData[idx];
    let chatEle = document.createElement("div");
    chatEle.className = "chatLi";
    if (!isMobile) chatEle.setAttribute("draggable", "true");
    else chatEle.ontouchstart = mobileDragStartEV;
    chatEle.ondragstart = chatDragStartEv;
    chatEle.innerHTML = `<svg width="24" height="24"><use xlink:href="#chatIcon" /></svg>
        <div class="chatInfo">
            <div class="chatName"></div>
            <div class="chatPre"></div>
        </div>
        <div class="chatOption"><svg data-type="chatEdit" width="24" height="24" role="img"><title>${translations[locale]["edit"]}</title><use xlink:href="#chatEditIcon" /></svg>
        <svg data-type="chatDel" width="24" height="24" role="img"><title>${translations[locale]["del"]}</title><use xlink:href="#delIcon" /></svg></div>`
    if (appendChat) chatListEle.appendChild(chatEle);
    initChatEle(idx, chatEle);
    chatEle.onclick = chatEleEvent;
    return chatEle;
};
const addNewChat = () => {
    let chat = {name: translations[locale]["newChatName"], data: []};
    if (presetRoleData.default) chat.data.unshift({role: "system", content: presetRoleData.default});
    preEle.selectedIndex = 0;
    chatsData.push(chat);
    chatIdxs.push(chatsData.length - 1);
    updateChats();
};
const delChat = (idx, ele, folderIdx, inFolderIdx) => {
    if (confirmAction(translations[locale]["delChatTip"])) {
        if (idx === activeChatIdx) endAll();
        if (folderIdx !== void 0) {
            let folder = folderData[folderIdx];
            folder.idxs.splice(inFolderIdx, 1);
            updateFolder(folderIdx);
            if (idx === activeChatIdx) {
                if (inFolderIdx - 1 >= 0) {
                    activeChatIdx = folder.idxs[inFolderIdx - 1];
                } else if (folder.idxs.length) {
                    activeChatIdx = folder.idxs[0];
                } else {
                    extraFolderActive(folderIdx);
                }
            }
        } else {
            let chatIdx = chatIdxs.indexOf(idx);
            chatIdxs.splice(chatIdx, 1);
            if (idx === activeChatIdx) {
                if (chatIdx - 1 >= 0) {
                    activeChatIdx = chatIdxs[chatIdx - 1];
                } else if (chatIdxs.length) {
                    activeChatIdx = chatIdxs[0];
                } else {
                    let folderNewIdx = -1;
                    for (let i = folderData.length - 1; i >= 0; i--) {
                        if (folderData[i].idxs.length) folderNewIdx = i;
                    }
                    if (folderNewIdx !== -1) {
                        activeChatIdx = folderData[folderNewIdx].idxs[0];
                    } else {
                        activeChatIdx = -1;
                    }
                }
            }
        }
        if (activeChatIdx > idx) activeChatIdx--;
        chatsData.splice(idx, 1);
        ele.remove();
        folderData.forEach(item => {
            if (item.idxs.length) {
                item.idxs.forEach((i, ix) => {
                    if (i > idx) item.idxs[ix] = i - 1;
                })
            }
        })
        chatIdxs.forEach((item, ix) => {
            if (item > idx) chatIdxs[ix] = item - 1;
        })
        if (activeChatIdx === -1) {
            addNewChat();
            activeChatIdx = 0;
            chatEleAdd(activeChatIdx);
        }
        updateChats();
        activeChat();
    }
};
const endEditEvent = (ev) => {
    if (!document.getElementById("activeChatEdit").contains(ev.target)) {
        endEditChat();
    }
};
const preventDrag = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
}
const endEditChat = () => {
    if (operateChatIdx !== void 0) {
        let ele = getChatEle(operateChatIdx);
        chatsData[operateChatIdx].name = ele.children[1].children[0].textContent = document.getElementById("activeChatEdit").value;
        ele.lastElementChild.remove();
    } else if (operateFolderIdx !== void 0) {
        let ele = folderListEle.children[operateFolderIdx].children[0];
        folderData[operateFolderIdx].name = ele.children[1].children[0].textContent = document.getElementById("activeChatEdit").value;
        ele.lastElementChild.remove();
    }
    updateChats();
    operateChatIdx = operateFolderIdx = void 0;
    document.body.removeEventListener("mousedown", endEditEvent, true);
}
const toEditName = (idx, ele, type) => {
    let inputEle = document.createElement("input");
    inputEle.id = "activeChatEdit";
    inputEle.setAttribute("draggable", "true");
    inputEle.ondragstart = preventDrag;
    ele.appendChild(inputEle);
    if (type) {
        inputEle.value = chatsData[idx].name;
        operateChatIdx = idx;
    } else {
        inputEle.value = folderData[idx].name;
        operateFolderIdx = idx;
    }
    inputEle.setSelectionRange(0, 0);
    inputEle.focus();
    inputEle.onkeydown = (e) => {
        if (e.keyCode === 13) {
            e.preventDefault();
            endEditChat();
        }
    };
    document.body.addEventListener("mousedown", endEditEvent, true);
    return inputEle;
};
const chatEleEvent = function (ev) {
    ev.preventDefault();
    ev.stopPropagation();
    let idx, folderIdx, inFolderIdx;
    if (chatListEle.contains(this)) {
        idx = Array.prototype.indexOf.call(chatListEle.children, this);
        idx = chatIdxs[idx];
    } else if (folderListEle.contains(this)) {
        folderIdx = Array.prototype.indexOf.call(folderListEle.children, this.parentElement.parentElement);
        inFolderIdx = Array.prototype.indexOf.call(this.parentElement.children, this);
        idx = folderData[folderIdx].idxs[inFolderIdx];
    }
    if (ev.target.classList.contains("chatLi")) {
        if (searchChatEle.value || activeChatIdx !== idx) {
            endAll();
            activeChatIdx = idx;
            activeChat(this);
        }
        if (window.innerWidth <= 800) {
            document.body.classList.remove("show-nav");
        }
    } else if (ev.target.dataset.type === "chatEdit") {
        toEditName(idx, this, 1);
    } else if (ev.target.dataset.type === "chatDel") {
        delChat(idx, this, folderIdx, inFolderIdx);
    }
};

async function updateMask(index){
    loglen=chatlog.children.length;
    if(loglen==0){
        Mask=document.getElementById('Mask');
        Mask.style.height = 0;            
        return;
    }
    if(loglen>=index && index>=0 ){
        Mask_height=chatlog.children[loglen-index-1].offsetTop;
        Mask=document.getElementById('Mask');
        Mask.style.height = Mask_height.toString()+"px";}
    }

const updateChats = () => {
    
    localStorage.setItem("chats", JSON.stringify(chatsData));
    updateChatIdxs();
    try {
        updateMask(contLen);
      } catch (error) {
        console.error("发生异常：", error.message);
        return null;
      } 
    
};
const updateChatIdxs = () => {
    localStorage.setItem("chatIdxs", JSON.stringify(chatIdxs));
    localStorage.setItem("folders", JSON.stringify(folderData));
}
const createConvEle = (className, append = true, model) => {
    let div = document.createElement("div");
    div.className = className;
    formatMdEle(div, model);
    if (append) chatlog.appendChild(div);
    return div;
}
const getChatEle = (idx) => {
    let chatIdx = chatIdxs.indexOf(idx);
    if (chatIdx !== -1) {
        return chatListEle.children[chatIdx];
    } else {
        let inFolderIdx;
        let folderIdx = folderData.findIndex(item => {
            inFolderIdx = item.idxs.indexOf(idx);
            return inFolderIdx !== -1;
        })
        if (folderIdx !== -1) {
            return folderListEle.children[folderIdx].children[1].children[inFolderIdx];
        }
    }
}
const activeChat = (ele) => {
    data = chatsData[activeChatIdx]["data"];
    allListEle.querySelectorAll(".activeChatLi").forEach(ele => {
        ele.classList.remove("activeChatLi");
    })
    allListEle.querySelectorAll(".activeFolder").forEach(ele => {
        ele.classList.remove("activeFolder")
    })
    if (!ele) ele = getChatEle(activeChatIdx);
    ele.classList.add("activeChatLi");
    activeChatEle = ele;
    if (chatIdxs.indexOf(activeChatIdx) === -1) {
        if (!ele.parentElement.parentElement.classList.contains("expandFolder")) {
            ele.parentElement.parentElement.classList.add("activeFolder");
        }
    }
    if (data[0] && data[0].role === "system") {
        systemRole = data[0].content;
        systemEle.value = systemRole;
    } else {
        systemRole = void 0;
        systemEle.value = "";
    }

    chatlog.innerHTML = "";

    if (systemRole ? data.length - 1 : data.length) {
        let firstIdx = systemRole ? 1 : 0;
        for (let i = firstIdx; i < data.length; i++) {
            if (data[i].role === "user") {
                createConvEle("request").children[0].textContent = data[i].content;
            } else {
                createConvEle("response", true, data[i].model).children[1].innerHTML = md.render(data[i].content) || "<br />";
            }
        }
    }
    let top = ele.offsetTop + ele.offsetHeight - allListEle.clientHeight;
    if (allListEle.scrollTop < top) allListEle.scrollTop = top;
    localStorage.setItem("activeChatIdx", activeChatIdx);
    if (searchIdxs[activeChatIdx] !== void 0) {
        let dataIdx = searchIdxs[activeChatIdx];
        if (dataIdx !== -1) {
            let childs = chatlog.children[systemRole ? dataIdx - 1 : dataIdx].children[1].getElementsByTagName("*");
            for (let i = childs.length - 1; i >= 0; i--) {
                if (childs[i].textContent && childs[i].textContent.indexOf(searchChatEle.value) !== -1) {
                    let offTop = findOffsetTop(childs[i], messagesEle);
                    messagesEle.scrollTop = offTop + childs[i].offsetHeight - messagesEle.clientHeight * 0.15;
                    break;
                }
            }
        } else messagesEle.scrollTop = 0;
    }
};
const findOffsetTop = (ele, target) => { // target is positioned ancestor element
    if (ele.offsetParent !== target) return ele.offsetTop + findOffsetTop(ele.offsetParent, target)
    else return ele.offsetTop
}
newChatEle.onclick = () => {
    endAll();
    addNewChat();
    activeChatIdx = chatsData.length - 1;
    chatEleAdd(activeChatIdx);
    activeChat(chatListEle.lastElementChild);
};
const initChats = () => {
    let localChats = localStorage.getItem("chats");
    let localFolders = localStorage.getItem("folders");
    let localChatIdxs = localStorage.getItem("chatIdxs")
    let localChatIdx = localStorage.getItem("activeChatIdx");
    activeChatIdx = (localChatIdx && parseInt(localChatIdx)) || 0;
    if (localChats) {
        chatsData = JSON.parse(localChats);
        let folderIdxs = [];
        if (localFolders) {
            folderData = JSON.parse(localFolders);
            for (let i = 0; i < folderData.length; i++) {
                folderEleAdd(i);
                folderIdxs.push(...folderData[i].idxs);
            }
        }
        if (localChatIdxs) {
            chatIdxs = JSON.parse(localChatIdxs);
            for (let i = 0; i < chatIdxs.length; i++) {
                chatEleAdd(chatIdxs[i]);
            }
        } else {
            for (let i = 0; i < chatsData.length; i++) {
                if (folderIdxs.indexOf(i) === -1) {
                    chatIdxs.push(i);
                    chatEleAdd(i);
                }
            }
            updateChatIdxs();
        }
    } else {
        addNewChat();
        chatEleAdd(activeChatIdx);
    }
    messagesEle.scrollTop = messagesEle.scrollHeight;
};
const initExpanded = () => {
    let folderIdx = folderData.findIndex(item => {
        return item.idxs.indexOf(activeChatIdx) !== -1;
    })
    if (folderIdx !== -1) {
        folderListEle.children[folderIdx].classList.add("expandFolder");
    }
}
initChats();
initExpanded();
activeChat();
document.getElementById("clearSearch").onclick = () => {
    searchChatEle.value = "";
    searchChatEle.dispatchEvent(new Event("input"));
    searchChatEle.focus();
}
let compositionFlag;
let lastCompositon;
searchChatEle.addEventListener("compositionstart", () => {
    compositionFlag = true;
});
searchChatEle.addEventListener("compositionend", (ev) => {
    compositionFlag = false;
    if (ev.data.length && ev.data === lastCompositon) {
        searchChatEle.dispatchEvent(new Event("input"));
    }
    lastCompositon = void 0;
});
searchChatEle.oninput = (ev) => {
    if (ev.isComposing) lastCompositon = ev.data;
    if (compositionFlag) return;
    let value = searchChatEle.value;
    if (value.length) {
        searchIdxs.length = 0;
        for (let i = 0; i < chatsData.length; i++) {
            let chatEle = getChatEle(i);
            chatEle.style.display = null;
            let nameIdx = chatsData[i].name.indexOf(value);
            let dataIdx = chatsData[i].data.findIndex(item => {
                return item.role !== "system" && item.content.indexOf(value) !== -1
            })
            if (nameIdx !== -1 || dataIdx !== -1) {
                let ele = chatEle.children[1];
                if (dataIdx !== -1) {
                    let data = chatsData[i].data[dataIdx];
                    let idx = data.content.indexOf(value);
                    ele.children[1].textContent = (idx > 8 ? "..." : "") + data.content.slice(idx > 8 ? idx - 5 : 0, idx);
                    ele.children[1].appendChild(document.createElement("span"));
                    ele.children[1].lastChild.textContent = value;
                    ele.children[1].appendChild(document.createTextNode(data.content.slice(idx + value.length)))
                } else {
                    initChatEle(i, chatEle);
                }
                if (nameIdx !== -1) {
                    ele.children[0].textContent = (nameIdx > 5 ? "..." : "") + chatsData[i].name.slice(nameIdx > 5 ? nameIdx - 3 : 0, nameIdx);
                    ele.children[0].appendChild(document.createElement("span"));
                    ele.children[0].lastChild.textContent = value;
                    ele.children[0].appendChild(document.createTextNode(chatsData[i].name.slice(nameIdx + value.length)))
                } else {
                    ele.children[0].textContent = chatsData[i].name;
                }
                searchIdxs[i] = dataIdx;
            } else {
                chatEle.style.display = "none";
                initChatEle(i, chatEle);
            }
        }
        for (let i = 0; i < folderListEle.children.length; i++) {
            let folderChatEle = folderListEle.children[i].children[1];
            if (!folderChatEle.children.length || Array.prototype.filter.call(folderChatEle.children, (ele) => {
                return ele.style.display !== "none"
            }).length === 0) {
                folderListEle.children[i].style.display = "none";
            }
        }
    } else {
        searchIdxs.length = 0;
        for (let i = 0; i < chatsData.length; i++) {
            let chatEle = getChatEle(i);
            chatEle.style.display = null;
            initChatEle(i, chatEle);
        }
        for (let i = 0; i < folderListEle.children.length; i++) {
            folderListEle.children[i].style.display = null;
        }
    }
};
const blobToText = (blob) => {
    return new Promise((res, rej) => {
        let reader = new FileReader();
        reader.readAsText(blob);
        reader.onload = () => {
            res(reader.result);
        }
        reader.onerror = (error) => {
            rej(error);
        }
    })
};
document.getElementById("exportChat").onclick = () => {
    if (loading) stopLoading();
    let data = {
        chatsData: chatsData,
        folderData: folderData,
        chatIdxs: chatIdxs
    }
    let blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    let date = new Date();
    let fileName = "chats-" + date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + ".json";
    downBlob(blob, fileName);
    notyf.success(translations[locale]["exportSuccTip"]);
};
document.getElementById("importChatInput").onchange = function () {
    let file = this.files[0];
    blobToText(file).then(text => {
        try {
            let json = JSON.parse(text);
            let checked = json.chatsData && json.folderData && json.chatIdxs && json.chatsData.every(item => {
                return item.name !== void 0 && item.data !== void 0;
            });
            if (checked) {
                let preFolder = folderData.length;
                let preLen = chatsData.length;
                if (json.chatsData) {
                    chatsData = chatsData.concat(json.chatsData);
                }
                if (json.folderData) {
                    for (let i = 0; i < json.folderData.length; i++) {
                        json.folderData[i].idxs = json.folderData[i].idxs.map(item => {
                            return item + preLen;
                        })
                        folderData.push(json.folderData[i]);
                        folderEleAdd(i + preFolder);
                    }
                }
                if (json.chatIdxs) {
                    for (let i = 0; i < json.chatIdxs.length; i++) {
                        let newIdx = json.chatIdxs[i] + preLen;
                        chatIdxs.push(newIdx)
                        chatEleAdd(newIdx);
                    }
                }
                updateChats();
                checkStorage();
                notyf.success(translations[locale]["importSuccTip"]);
            } else {
                throw new Error("fmt error");
            }
        } catch (e) {
            notyf.error(translations[locale]["importFailTip"]);
        }
        this.value = "";
    })
};
clearChatSet.onclick = clearChat.onclick = () => {
    if (confirmAction(translations[locale]["clearAllTip"])) {
        chatsData.length = 0;
        chatIdxs.length = 0;
        folderData.length = 0;
        folderListEle.innerHTML = "";
        chatListEle.innerHTML = "";
        endAll();
        addNewChat();
        activeChatIdx = 0;
        chatEleAdd(activeChatIdx);
        updateChats();
        checkStorage();
        activeChat(chatListEle.firstElementChild);
        notyf.success(translations[locale]["clearChatSuccTip"]);
    }
};
let localSetKeys = ['modelVersion', 'APISelect', 'APIHost', 'APIKey', 'hotKeys', 'userAvatar', 'system', 'temp', 'top_p', 'convWidth0', 'convWidth1', 'textSpeed', 'contLen', 'enableLongReply', 'existVoice', 'voiceTestText', 'azureRegion', 'azureKey', 'enableContVoice', 'enableAutoVoice', 'voiceRecLang', 'autoVoiceSendWord', 'autoVoiceStopWord', 'autoVoiceSendOut', 'keepListenMic', 'fullWindow', 'themeMode', 'autoThemeMode', 'customDarkTime', 'UILang', 'pinNav', 'voice0', 'voicePitch0', 'voiceVolume0', 'voiceRate0', 'azureRole0', 'azureStyle0', 'voice1', 'voicePitch1', 'voiceVolume1', 'voiceRate1', 'azureRole1', 'azureStyle1'];
document.getElementById("exportSet").onclick = () => {
    let data = {}
    for (let i = 0; i < localSetKeys.length; i++) {
        let key = localSetKeys[i];
        let val = localStorage.getItem(key);
        if (val != void 0) data[key] = val;
    }
    let blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    let date = new Date();
    let fileName = "settings-" + date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + ".json";
    downBlob(blob, fileName);
    notyf.success(translations[locale]["exportSuccTip"]);
};
document.getElementById("importSetInput").onchange = function () {
    let file = this.files[0];
    blobToText(file).then(text => {
        try {
            let json = JSON.parse(text);
            let keys = Object.keys(json);
            for (let i = 0; i < localSetKeys.length; i++) {
                let key = localSetKeys[i];
                let val = json[key];
                if (val !== void 0) localStorage.setItem(key, val);
                else localStorage.removeItem(key);
            }
            initSetting();
            initVoiceVal();
            speechServiceEle.dispatchEvent(new Event("change"));
            initRecSetting();
            initHotKey();
            initLang();
            checkStorage();
            notyf.success(translations[locale]["importSuccTip"]);
        } catch (e) {
            notyf.error(translations[locale]["importFailTip"]);
        }
        this.value = "";
    })
};
document.getElementById("resetSet").onclick = () => {
    if (confirmAction(translations[locale]["resetSetTip"])) {
        endAll();
        if (existVoice === 3) localStorage.removeItem(azureRegion + "voiceData");
        let data = {};
        for (let i = 0; i < localSetKeys.length; i++) {
            let key = localSetKeys[i];
            let val = localStorage.removeItem(key);
        }
        initSetting();
        initVoiceVal();
        speechServiceEle.dispatchEvent(new Event("change"));
        initRecSetting();
        initHotKey();
        initLang();
        checkStorage();
        notyf.success(translations[locale]["resetSetSuccTip"]);
    }
}
const endAll = () => {
    endSpeak();
    if (editingIdx !== void 0) resumeSend();
    if (loading) stopLoading();
};
const processIdx = (plus) => {
    if (currentVoiceIdx !== void 0) currentVoiceIdx += plus;
    if (editingIdx !== void 0) editingIdx += plus;
}
const hotKeyVals = {};
const ctrlHotKeyEv = (ev) => {
    if (ev.ctrlKey || ev.metaKey) {
        switch (ev.key.toLowerCase()) {
            case hotKeyVals["Nav"]:
                ev.preventDefault();
                toggleNavEv();
                return false;
            case hotKeyVals["Search"]:
                ev.preventDefault();
                searchChatEle.focus();
                return false;
            case hotKeyVals["Input"]:
                ev.preventDefault();
                inputAreaEle.focus();
                return false;
            case hotKeyVals["NewChat"]:
                ev.preventDefault();
                newChatEle.dispatchEvent(new MouseEvent("click"));
                return false;
            case hotKeyVals["ClearChat"]:
                ev.preventDefault();
                clearEle.dispatchEvent(new MouseEvent("click"));
                return false;
            case hotKeyVals["VoiceRec"]:
                if (supportRec) {
                    ev.preventDefault();
                    toggleRecEv();
                }
                return false;
            case hotKeyVals["VoiceSpeak"]:
                ev.preventDefault();
                speechEvent(systemRole ? 1 : 0);
                return false;
        }
    }
}
const ctrlAltHotKeyEv = (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.altKey) {
        switch (ev.key.toLowerCase()) {
            case hotKeyVals["Window"]:
                ev.preventDefault();
                toggleFull.dispatchEvent(new Event("click"));
                return false;
            case hotKeyVals["Theme"]:
                ev.preventDefault();
                lightEle.dispatchEvent(new Event("click"));
                return false;
            case hotKeyVals["Lang"]:
                ev.preventDefault();
                let idx = localeList.indexOf(locale) + 1;
                if (idx === localeList.length) idx = 0;
                locale = localeList[idx];
                setLang();
                changeLocale();
                return false;
        }
    }
}
const listKey = ['Nav', 'Search', 'Input', 'NewChat', 'ClearChat', 'VoiceRec', 'VoiceSpeak', 'Window', 'Theme', 'Lang'];
const ctrlKeyIdx = 7;
const defKeyVal = ['b', 'k', 'i', 'e', 'r', 'q', 's', 'u', 't', 'l'];
const initHotKey = () => {
    let localKeysObj = {};
    let localKeys = localStorage.getItem("hotKeys");
    if (localKeys) {
        try {
            localKeysObj = JSON.parse(localKeys);
        } catch (e) { }
    }
    let pre1 = isApple ? "⌘ + " : "Ctrl + ";
    let pre2 = isApple ? "⌘ + ⌥ + " : "Ctrl + Alt + ";
    for (let i = 0; i < listKey.length; i++) {
        let key = listKey[i];
        if (key === "VoiceRec" && !supportRec) continue;
        let ele = window["hotKey" + key];
        for (let j = 0; j < 26; j++) {
            // top-level hotkey, can't overwrite
            if (i < ctrlKeyIdx && (j === 13 || j === 19 || j === 22)) continue;
            let val = String.fromCharCode(j + 97);
            ele.options.add(new Option((i < ctrlKeyIdx ? pre1 : pre2) + val.toUpperCase(), val));
        }
        hotKeyVals[key] = ele.value = localKeysObj[key] || defKeyVal[i];
        ele.onchange = () => {
            if (hotKeyVals[key] === ele.value) return;
            let exist = listKey.find((item, idx) => {
                return (i < ctrlKeyIdx ? idx < ctrlKeyIdx : idx >= ctrlKeyIdx) && hotKeyVals[item] === ele.value;
            })
            if (exist) {
                ele.value = hotKeyVals[key];
                notyf.error(translations[locale]["hotkeyConflict"])
                return;
            }
            hotKeyVals[key] = ele.value;
            localStorage.setItem("hotKeys", JSON.stringify(hotKeyVals));
        }
    }
};
initHotKey();
document.addEventListener("keydown", ctrlHotKeyEv);
document.addEventListener("keydown", ctrlAltHotKeyEv);
const initSetting = () => {
    const modelEle = document.getElementById("preSetModel");
    let localModel = localStorage.getItem("modelVersion");
    modelVersion = modelEle.value = localModel || "gpt-3.5-turbo";
    modelEle.onchange = () => {
        modelVersion = modelEle.value;
        localStorage.setItem("modelVersion", modelVersion);
        apiHost = apiHostEle.value = envAPIEndpoint || localApiHost || apiHostEle.getAttribute("value") || "";
        if (modelVersion=="Claude-2"){apiHost=envClaudeAPIEndpoint;localStorage.setItem("APIHost", apiHost);}////////////////////////////////////////
    }
    modelEle.dispatchEvent(new Event("change"));
    const apiHostEle = document.getElementById("apiHostInput");
    const apiSelectEle = document.getElementById("apiSelect");
    let localApiSelect = localStorage.getItem("APISelect");
    if (localApiSelect) {
        try {
            apiSelects = JSON.parse(localApiSelect);
        } catch (e) {
            apiSelects.length = 0;
        }
    } else {
        apiSelects.length = 0;
    }
    const delApiOption = function (ev) {
        ev.stopPropagation();
        let index = Array.prototype.indexOf.call(apiSelectEle.children, this.parentElement);
        apiSelects.splice(index, 1);
        this.parentElement.remove();
        localStorage.setItem("APISelect", JSON.stringify(apiSelects));
        if (!apiSelects.length) apiSelectEle.style.display = "none";
    }
    const appendApiOption = () => {
        apiSelects.push(apiHost);
        initApiOption(apiHost);
        localStorage.setItem("APISelect", JSON.stringify(apiSelects));
    }
    const selApiOption = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        apiSelectEle.style.display = "none";
        let index = Array.prototype.indexOf.call(apiSelectEle.children, this);
        apiHostEle.value = apiSelects[index];
        apiHostEle.dispatchEvent(new Event("change"));
    }
    const initApiOption = (api) => {
        let optionEle = document.createElement("div");
        optionEle.onclick = selApiOption;
        let textEle = document.createElement("span");
        textEle.textContent = api;
        optionEle.appendChild(textEle);
        let delEle = document.createElement("div");
        delEle.className = "delApiOption";
        delEle.onclick = delApiOption;
        delEle.innerHTML = `<svg width="24" height="24"><use xlink:href="#closeIcon" /></svg>`;
        optionEle.appendChild(delEle);
        apiSelectEle.appendChild(optionEle);
    }
    const initApiSelectEle = () => {
        apiSelectEle.innerHTML = "";
        for (let i = 0; i < apiSelects.length; i++) {
            initApiOption(apiSelects[i]);
        }
    }
    initApiSelectEle();
    apiHostEle.onfocus = () => {
        if (apiSelects.length) apiSelectEle.style.display = "block";
    }
    apiHostEle.onblur = (ev) => {
        if (!(ev.relatedTarget && apiSelectEle.contains(ev.relatedTarget))) apiSelectEle.style.display = "none";
    }
    let localApiHost = localStorage.getItem("APIHost");
    
    apiHost = apiHostEle.value = envAPIEndpoint || localApiHost || apiHostEle.getAttribute("value") || "";
   
    apiHostEle.onchange = () => {
        if (modelVersion=="Claude-2"){apiHost=envClaudeAPIEndpoint}
        apiHost = apiHostEle.value;
        if (apiHost.length && !apiHost.endsWith("/")) {
            apiHost += "/";
            apiHostEle.value = apiHost;
        }
        if (apiHost && apiSelects.indexOf(apiHost) === -1) appendApiOption();
        if (modelVersion=="Claude-2"){apiHost=envClaudeAPIEndpoint}////////////////////////////////////////
        localStorage.setItem("APIHost", apiHost);
    }
    apiHostEle.dispatchEvent(new Event("change"));
    const keyEle = document.getElementById("keyInput");
    let localKey = localStorage.getItem("APIKey");
    customAPIKey = keyEle.value = envAPIKey || localKey || keyEle.getAttribute("value") || "";
    keyEle.onchange = () => {
        quotaContent.style.display = "none";
        customAPIKey = keyEle.value;
        localStorage.setItem("APIKey", customAPIKey);
    }
    keyEle.dispatchEvent(new Event("change"));
    const updateAvatar = () => {
        setAvatarPre.src = userAvatar;
        chatlog.querySelectorAll(".request>.chatAvatar").forEach(ele => {
            ele.children[0].src = userAvatar;
        })
    }
    let localAvatar = localStorage.getItem("userAvatar");
    userAvatar = setAvatarPre.src = setAvatar.value = localAvatar || setAvatar.getAttribute("value") || "avatar.jpg";
    setAvatar.onchange = () => {
        userAvatar = setAvatar.value;
        localStorage.setItem("userAvatar", userAvatar);
        updateAvatar();
    }
    setAvatar.dispatchEvent(new Event("change"));
    let localSystem = localStorage.getItem("system");
    systemEle.onchange = () => {
        systemRole = systemEle.value ;
        localStorage.setItem("system", systemRole);
        
        if (systemRole) {
            if (data[0] && data[0].role === "system") {
                data[0].content = systemRole ;
            } else {
                data.unshift({role: "system", content: systemRole });
                processIdx(1);
            }
        } else if (data[0] && data[0].role === "system") {
            data.shift();
            processIdx(-1);
        }
        updateChats();
    }
    if (systemRole === void 0) {
        systemRole = systemEle.value = localSystem || presetRoleData.default || "" ;
        
        if (systemRole) {
            data.unshift({role: "system", content: systemRole });
            processIdx(1);
            updateChats();
        }
    }
    preEle.onchange = () => {
        let val = preEle.value;
        if (val && presetRoleData[val]) {
            systemEle.value = presetRoleData[val];
        } else {
            systemEle.value = "";
        }
        systemEle.dispatchEvent(new Event("change"));
        systemEle.focus();
    }
    const topEle = document.getElementById("top_p");
    let localTop = localStorage.getItem("top_p");
    topEle.value = roleNature = parseFloat(localTop || topEle.getAttribute("value"));
    topEle.oninput = () => {
        topEle.style.backgroundSize = (topEle.value - topEle.min) * 100 / (topEle.max - topEle.min) + "% 100%";
        roleNature = parseFloat(topEle.value);
        localStorage.setItem("top_p", topEle.value);
    }
    topEle.dispatchEvent(new Event("input"));
    const tempEle = document.getElementById("temp");
    let localTemp = localStorage.getItem("temp");
    tempEle.value = roleTemp = parseFloat(localTemp || tempEle.getAttribute("value"));
    tempEle.oninput = () => {
        tempEle.style.backgroundSize = (tempEle.value - tempEle.min) * 100 / (tempEle.max - tempEle.min) + "% 100%";
        roleTemp = parseFloat(tempEle.value);
        localStorage.setItem("temp", tempEle.value);
    }
    tempEle.dispatchEvent(new Event("input"));
    const convWEle = document.getElementById("convWidth");
    const styleSheet = document.styleSheets[0];
    convWEle.oninput = () => {
        let type = isFull ? 1 : 0;
        convWEle.style.backgroundSize = (convWEle.value - convWEle.min) * 100 / (convWEle.max - convWEle.min) + "% 100%";
        convWidth[type] = parseInt(convWEle.value);
        localStorage.setItem("convWidth" + type, convWEle.value);
        styleSheet.deleteRule(0);
        styleSheet.deleteRule(0);
        styleSheet.insertRule(`.bottom_wrapper{max-width:${convWidth[type]}%;}`, 0);
        styleSheet.insertRule(`.requestBody,.response .markdown-body{max-width:calc(${convWidth[type]}% - 75px);}`, 0);////////////////////////////
    }
    const setConvValue = () => {
        let type = isFull ? 1 : 0;
        let localConv = localStorage.getItem("convWidth" + type);
        convWEle.value = parseInt(localConv || (type ? "60" : "100"));
        convWEle.dispatchEvent(new Event("input"));
    }
    const fullFunc = () => {
        isFull = windowEle.classList.contains("full_window");
        localStorage.setItem("fullWindow", isFull);
        setConvValue();
        toggleFull.title = isFull ? translations[locale]["winedWin"] : translations[locale]["fullWin"];
        toggleFull.children[0].children[0].setAttributeNS("http://www.w3.org/1999/xlink", "href", isFull ? "#collapseFullIcon" : "#expandFullIcon");
    }
    toggleFull.onclick = () => {
        windowEle.classList.toggle("full_window");
        fullFunc();
    }
    let localFull = localStorage.getItem("fullWindow");
    if (localFull && localFull === "true") {
        if (!windowEle.classList.contains("full_window")) {
            windowEle.classList.add("full_window");
            fullFunc();
        }
    } else if (windowEle.classList.contains("full_window")) {
        windowEle.classList.remove("full_window");
        fullFunc();
    } else {
        setConvValue();
    }
    const speedEle = document.getElementById("textSpeed");
    let localSpeed = localStorage.getItem("textSpeed");
    speedEle.value = localSpeed || speedEle.getAttribute("value");
    textSpeed = parseFloat(speedEle.min) + (speedEle.max - speedEle.value);
    speedEle.oninput = () => {
        speedEle.style.backgroundSize = (speedEle.value - speedEle.min) * 100 / (speedEle.max - speedEle.min) + "% 100%";
        textSpeed = parseFloat(speedEle.min) + (speedEle.max - speedEle.value);
        localStorage.setItem("textSpeed", speedEle.value);
    }
    speedEle.dispatchEvent(new Event("input"));
    if (localStorage.getItem("enableCont") != null) { // fallback old cont
        if (localStorage.getItem("enableCont") === "false") localStorage.setItem("contLength", 0);
        localStorage.removeItem("enableCont");
    }
    const contLenEle = document.getElementById("contLength");
    let localContLen = localStorage.getItem("contLength");
    contLenEle.value = contLen = parseInt(localContLen || contLenEle.getAttribute("value"));
    contLenEle.oninput = () => {
        contLenEle.style.backgroundSize = (contLenEle.value - contLenEle.min) * 100 / (contLenEle.max - contLenEle.min) + "% 100%";
        contLen = parseInt(contLenEle.value);
        contLenWrap.textContent = contLen;
        localStorage.setItem("contLength", contLenEle.value);
        updateMask(contLen);
    }
    contLenEle.dispatchEvent(new Event("input"));
    const longEle = document.getElementById("enableLongReply");
    let localLong = localStorage.getItem("enableLongReply");
    longEle.checked = enableLongReply = (localLong || longEle.getAttribute("checked")) === "true";
    longEle.onchange = () => {
        enableLongReply = longEle.checked;
        localStorage.setItem("enableLongReply", enableLongReply);
    }
    longEle.dispatchEvent(new Event("change"));
    let localPin = localStorage.getItem("pinNav");
    if (window.innerWidth > 800 && !(localPin && localPin === "false")) {
        document.body.classList.add("show-nav");
    };
    const setDarkTheme = (is) => {
        let cssEle = document.body.getElementsByTagName("link")[0];
        cssEle.href = cssEle.href.replace(is ? "light" : "dark", is ? "dark" : "light");
        justDarkTheme(is);
    }
    const handleAutoMode = (ele) => {
        if (ele.checked) {
            autoThemeMode = parseInt(ele.value);
            localStorage.setItem("autoThemeMode", autoThemeMode);
            initAutoTime();
            if (autoThemeMode) {
                if (customDarkOut !== void 0) {
                    clearTimeout(customDarkOut);
                    customDarkOut = void 0;
                }
                setDarkTheme(darkMedia.matches);
            } else {
                checkCustomTheme();
            }
        }
    }
    autoTheme0.onchange = autoTheme1.onchange = function () {handleAutoMode(this)};
    const handleAutoTime = (ele, idx) => {
        let otherIdx = 1 - idx;
        if (ele.value !== customDarkTime[otherIdx]) {
            customDarkTime[idx] = ele.value;
            localStorage.setItem("customDarkTime", JSON.stringify(customDarkTime));
            checkCustomTheme();
        } else {
            ele.value = customDarkTime[idx];
            notyf.error(translations[locale]["customDarkTip"]);
        }
    }
    customStart.onchange = function () {handleAutoTime(this, 0)};
    customEnd.onchange = function () {handleAutoTime(this, 1)};
    const initAutoTime = () => {
        customAutoSet.style.display = autoThemeMode === 0 ? "block" : "none";
        if (autoThemeMode === 0) {
            customStart.value = customDarkTime[0];
            customEnd.value = customDarkTime[1];
        }
    }
    const initAutoThemeEle = () => {
        autoThemeEle.querySelector("#autoTheme" + autoThemeMode).checked = true;
        initAutoTime();
    }
    const checkCustomTheme = () => {
        if (customDarkOut !== void 0) clearTimeout(customDarkOut);
        let date = new Date();
        let nowTime = date.getTime();
        let start = customDarkTime[0].split(":");
        let startTime = new Date().setHours(start[0], start[1], 0, 0);
        let end = customDarkTime[1].split(":");
        let endTime = new Date().setHours(end[0], end[1], 0, 0);
        let order = endTime > startTime;
        let isDark = order ? (nowTime > startTime && endTime > nowTime) : !(nowTime > endTime && startTime > nowTime);
        let nextChange = isDark ? endTime - nowTime : startTime - nowTime;
        if (nextChange < 0) nextChange += dayMs;
        setDarkTheme(isDark);
        customDarkOut = setTimeout(() => {
            checkCustomTheme();
        }, nextChange);
    }
    const setDarkMode = () => {
        if (customDarkOut !== void 0) {
            clearTimeout(customDarkOut);
            customDarkOut = void 0;
        }
        autoThemeEle.style.display = "none";
        let themeClass, title;
        if (themeMode === 2) {
            autoThemeEle.style.display = "block";
            if (autoThemeMode) {
                setDarkTheme(darkMedia.matches);
            } else {
                checkCustomTheme();
                initAutoThemeEle();
            }
            themeClass = "autoTheme";
            title = translations[locale]["autoTheme"];
        } else if (themeMode === 1) {
            setDarkTheme(false);
            themeClass = "lightTheme";
            title = translations[locale]["lightTheme"];
        } else {
            setDarkTheme(true);
            themeClass = "darkTheme";
            title = translations[locale]["darkTheme"];
        }
        localStorage.setItem("themeMode", themeMode);
        setLightEle.className = "setDetail themeDetail " + themeClass;
        lightEle.children[0].children[0].setAttributeNS("http://www.w3.org/1999/xlink", "href", "#" + themeClass + "Icon");
        lightEle.title = title;
    }
    lightEle.onclick = () => {
        themeMode = themeMode - 1;
        if (themeMode === -1) themeMode = 2;
        setDarkMode();
    }
    setLightEle.onclick = (ev) => {
        let idx = Array.prototype.indexOf.call(setLightEle.children, ev.target);
        if (themeMode !== idx) {
            themeMode = idx;
            setDarkMode();
        }
    }
    let localTheme = localStorage.getItem("themeMode");
    themeMode = parseInt(localTheme || "1");
    let localAutoTheme = localStorage.getItem("autoThemeMode");
    autoThemeMode = parseInt(localAutoTheme || "1");
    let localCustomDark = localStorage.getItem("customDarkTime");
    customDarkTime = JSON.parse(localCustomDark || '["21:00", "07:00"]');
    setDarkMode();
    darkMedia.onchange = e => {
        if (themeMode === 2 && autoThemeMode) setDarkTheme(e.matches);
    };
};
initSetting();
document.getElementById("loadMask").style.display = "none";
messagesEle.scrollTo(0, messagesEle.scrollHeight);
const closeEvent = (ev) => {
    if (settingEle.contains(ev.target)) return;
    if (!dialogEle.contains(ev.target)) {
        dialogEle.style.display = "none";
        document.removeEventListener("mousedown", closeEvent, true);
        settingEle.classList.remove("showSetting");
        stopTestVoice();
    }
}
settingEle.onmousedown = () => {
    dialogEle.style.display = dialogEle.style.display === "block" ? "none" : "block";
    if (dialogEle.style.display === "block") {
        document.addEventListener("mousedown", closeEvent, true);
        settingEle.classList.add("showSetting");
    } else {
        document.removeEventListener("mousedown", closeEvent, true);
        settingEle.classList.remove("showSetting");
    }
}
let delayId;
const delay = () => {
    return new Promise((resolve) => delayId = setTimeout(resolve, textSpeed)); //打字机时间间隔
}
const uuidv4 = () => {
    let uuid = ([1e7] + 1e3 + 4e3 + 8e3 + 1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
    return existVoice === 3 ? uuid.toUpperCase() : uuid;
}
const getTime = () => {
    return existVoice === 3 ? new Date().toISOString() : new Date().toString();
}
const getWSPre = (date, requestId) => {
    let osPlatform = (typeof window !== "undefined") ? "Browser" : "Node";
    osPlatform += "/" + navigator.platform;
    let osName = navigator.userAgent;
    let osVersion = navigator.appVersion;
    return `Path: speech.config\r\nX-RequestId: ${requestId}\r\nX-Timestamp: ${date}\r\nContent-Type: application/json\r\n\r\n{"context":{"system":{"name":"SpeechSDK","version":"1.26.0","build":"JavaScript","lang":"JavaScript","os":{"platform":"${osPlatform}","name":"${osName}","version":"${osVersion}"}}}}`
}
const getWSAudio = (date, requestId) => {
    return existVoice === 3 ? `Path: synthesis.context\r\nX-RequestId: ${requestId}\r\nX-Timestamp: ${date}\r\nContent-Type: application/json\r\n\r\n{"synthesis":{"audio":{"metadataOptions":{"sentenceBoundaryEnabled":false,"wordBoundaryEnabled":false},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}`
        : `X-Timestamp:${date}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`
}
const getWSText = (date, requestId, lang, voice, volume, rate, pitch, style, role, msg) => {
    let fmtVolume = volume === 1 ? "+0%" : volume * 100 - 100 + "%";
    let fmtRate = (rate >= 1 ? "+" : "") + (rate * 100 - 100) + "%";
    let fmtPitch = (pitch >= 1 ? "+" : "") + (pitch - 1) + "Hz";
    msg = getEscape(msg);
    if (existVoice === 3) {
        let fmtStyle = style ? ` style="${style}"` : "";
        let fmtRole = role ? ` role="${role}"` : "";
        let fmtExpress = fmtStyle + fmtRole;
        return `Path: ssml\r\nX-RequestId: ${requestId}\r\nX-Timestamp: ${date}\r\nContent-Type: application/ssml+xml\r\n\r\n<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='https://www.w3.org/2001/mstts' xml:lang='${lang}'><voice name='${voice}'><mstts:express-as${fmtExpress}><prosody pitch='${fmtPitch}' rate='${fmtRate}' volume='${fmtVolume}'>${msg}</prosody></mstts:express-as></voice></speak>`;
    } else {
        return `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${date}Z\r\nPath:ssml\r\n\r\n<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='https://www.w3.org/2001/mstts' xml:lang='${lang}'><voice name='${voice}'><prosody pitch='${fmtPitch}' rate='${fmtRate}' volume='${fmtVolume}'>${msg}</prosody></voice></speak>`;
    }
}
const getAzureWSURL = () => {
    return `wss://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/websocket/v1?Authorization=bearer%20${azureToken}`
}
const edgeTTSURL = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const resetSpeakIcon = () => {
    if (currentVoiceIdx !== void 0) {
        chatlog.children[systemRole ? currentVoiceIdx - 1 : currentVoiceIdx].classList.remove("showVoiceCls");
        chatlog.children[systemRole ? currentVoiceIdx - 1 : currentVoiceIdx].querySelector('.optionItems').lastChild.className = "optionItem readyVoice";
    }
}
const endSpeak = () => {
    resetSpeakIcon();
    currentVoiceIdx = void 0;
    if (voiceIns && voiceIns instanceof Audio) {
        voiceIns.pause();
        voiceIns.currentTime = 0;
        URL.revokeObjectURL(voiceIns.src);
        voiceIns.removeAttribute("src");
        voiceIns.onended = voiceIns.onerror = null;
        sourceBuffer = void 0;
        speechPushing = false;
        if (voiceSocket && voiceSocket["pending"]) {
            voiceSocket.close()
        }
        if (autoVoiceSocket && autoVoiceSocket["pending"]) {
            autoVoiceSocket.close()
        }
        speechQuene.length = 0;
        autoMediaSource = void 0;
        voiceContentQuene = [];
        voiceEndFlagQuene = [];
        voiceBlobURLQuene = [];
        autoOnlineVoiceFlag = false;
    } else if (supportSpe) {
        speechSynthesis.cancel();
    }
}
const speakEvent = (ins, force = true, end = false) => {
    return new Promise((res, rej) => {
        ins.onerror = () => {
            if (end) {
                endSpeak();
            } else if (force) {
                resetSpeakIcon(); debugger
            }
            res();
        }
        if (ins instanceof Audio) {
            ins.onended = ins.onerror;
            ins.play();
        } else {
            ins.onend = ins.onerror;
            speechSynthesis.speak(voiceIns);
        }
    })
};
let voiceData = [];
let voiceSocket;
let speechPushing = false;
let speechQuene = [];
let sourceBuffer;
speechQuene.push = function (buffer) {
    if (!speechPushing && (sourceBuffer && !sourceBuffer.updating)) {
        speechPushing = true;
        sourceBuffer.appendBuffer(buffer);
    } else {
        Array.prototype.push.call(this, buffer)
    }
}
const initSocket = () => {
    return new Promise((res, rej) => {
        if (!voiceSocket || voiceSocket.readyState > 1) {
            voiceSocket = new WebSocket(existVoice === 3 ? getAzureWSURL() : edgeTTSURL);
            voiceSocket.binaryType = "arraybuffer";
            voiceSocket.onopen = () => {
                res();
            };
            voiceSocket.onerror = () => {
                rej();
            }
        } else {
            return res();
        }
    })
}
const initStreamVoice = (mediaSource) => {
    return new Promise((r, j) => {
        Promise.all([initSocket(), new Promise(res => {
            mediaSource.onsourceopen = () => {
                res();
            };
        })]).then(() => {
            r();
        })
    })
}
let downQuene = {};
let downSocket;
const downBlob = (blob, name) => {
    let a = document.createElement("a");
    a.download = name;
    a.href = URL.createObjectURL(blob);
    a.click();
}
const initDownSocket = () => {
    return new Promise((res, rej) => {
        if (!downSocket || downSocket.readyState > 1) {
            downSocket = new WebSocket(existVoice === 3 ? getAzureWSURL() : edgeTTSURL);
            downSocket.binaryType = "arraybuffer";
            downSocket.onopen = () => {
                res();
            };
            downSocket.onmessage = (e) => {
                if (e.data instanceof ArrayBuffer) {
                    let text = new TextDecoder().decode(e.data.slice(0, 130));
                    let reqIdx = text.indexOf(":");
                    let uuid = text.slice(reqIdx + 1, reqIdx + 33);
                    downQuene[uuid]["blob"].push(e.data.slice(130));
                } else if (e.data.indexOf("Path:turn.end") !== -1) {
                    let reqIdx = e.data.indexOf(":");
                    let uuid = e.data.slice(reqIdx + 1, reqIdx + 33);
                    let blob = new Blob(downQuene[uuid]["blob"], {type: voiceMIME});
                    let key = downQuene[uuid]["key"];
                    let name = downQuene[uuid]["name"];
                    if (blob.size === 0) {
                        notyf.open({
                            type: "warning",
                            message: translations[locale]["cantSpeechTip"]
                        });
                        return;
                    }
                    voiceData[key] = blob;
                    if (downQuene[uuid]["isTest"]) {
                        testVoiceBlob = blob;
                        playTestAudio();
                    } else {
                        downBlob(blob, name.slice(0, 16) + ".mp3");
                    }
                }
            }
            downSocket.onerror = () => {
                rej();
            }
        } else {
            return res();
        }
    })
}
let testVoiceBlob;
let testVoiceIns;
const playTestAudio = () => {
    if (existVoice >= 2) {
        if (!testVoiceIns || testVoiceIns instanceof Audio === false) {
            testVoiceIns = new Audio();
            testVoiceIns.onended = testVoiceIns.onerror = () => {
                stopTestVoice();
            }
        }
        testVoiceIns.src = URL.createObjectURL(testVoiceBlob);
        testVoiceIns.play(); 
    } else if (supportSpe) {
        speechSynthesis.speak(testVoiceIns);
    }
}
const pauseTestVoice = () => {
    if (testVoiceIns) {
        if (testVoiceIns && testVoiceIns instanceof Audio) {
            testVoiceIns.pause();
        } else if (supportSpe) {
            speechSynthesis.pause();
        }
    }
    testVoiceBtn.className = "justSetLine resumeTestVoice";
}
const resumeTestVoice = () => {
    if (testVoiceIns) {
        if (testVoiceIns && testVoiceIns instanceof Audio) {
            testVoiceIns.play();
        } else if (supportSpe) {
            speechSynthesis.resume();
        }
    }
    testVoiceBtn.className = "justSetLine pauseTestVoice";
}
const stopTestVoice = () => {
    if (testVoiceIns) {
        if (testVoiceIns instanceof Audio) {
            testVoiceIns.pause();
            testVoiceIns.currentTime = 0;
            URL.revokeObjectURL(testVoiceIns.src);
            testVoiceIns.removeAttribute("src");
        } else if (supportSpe) {
            speechSynthesis.cancel();
        }
    }
    testVoiceBtn.className = "justSetLine readyTestVoice";
}
const startTestVoice = async () => {
    testVoiceBtn.className = "justSetLine pauseTestVoice";
    let volume = voiceVolume[voiceType];
    let rate = voiceRate[voiceType];
    let pitch = voicePitch[voiceType];
    let content = voiceTestText;
    if (existVoice >= 2) {
        let voice = existVoice === 3 ? voiceRole[voiceType].ShortName : voiceRole[voiceType].Name;
        let style = azureStyle[voiceType];
        let role = azureRole[voiceType];
        let key = content + voice + volume + rate + pitch + (style ? style : "") + (role ? role : "");
        let blob = voiceData[key];
        if (blob) {
            testVoiceBlob = blob;
            playTestAudio();
        } else {
            await initDownSocket();
            let currDate = getTime();
            let lang = voiceRole[voiceType].lang;
            let uuid = uuidv4();
            if (existVoice === 3) {
                downSocket.send(getWSPre(currDate, uuid));
            }
            downSocket.send(getWSAudio(currDate, uuid));
            downSocket.send(getWSText(currDate, uuid, lang, voice, volume, rate, pitch, style, role, content));
            downSocket["pending"] = true;
            downQuene[uuid] = {};
            downQuene[uuid]["name"] = content;
            downQuene[uuid]["key"] = key;
            downQuene[uuid]["isTest"] = true;
            downQuene[uuid]["blob"] = [];
        }
    } else {
        testVoiceIns = new SpeechSynthesisUtterance();
        testVoiceIns.onend = testVoiceIns.onerror = () => {
            stopTestVoice();
        }
        testVoiceIns.voice = voiceRole[voiceType];
        testVoiceIns.volume = volume;
        testVoiceIns.rate = rate;
        testVoiceIns.pitch = pitch;
        testVoiceIns.text = content;
        playTestAudio();
    }
}
const downloadAudio = async (idx) => {
    if (existVoice < 2) {
        return;
    }
    let type = data[idx].role === "user" ? 0 : 1;
    let voice = existVoice === 3 ? voiceRole[type].ShortName : voiceRole[type].Name;
    let volume = voiceVolume[type];
    let rate = voiceRate[type];
    let pitch = voicePitch[type];
    let style = azureStyle[type];
    let role = azureRole[type];
    let content = data[idx].content;
    let key = content + voice + volume + rate + pitch + (style ? style : "") + (role ? role : "");
    let blob = voiceData[key];
    if (blob) {
        downBlob(blob, content.slice(0, 16) + ".mp3");
    } else {
        await initDownSocket();
        let currDate = getTime();
        let lang = voiceRole[type].lang;
        let uuid = uuidv4();
        if (existVoice === 3) {
            downSocket.send(getWSPre(currDate, uuid));
        }
        downSocket.send(getWSAudio(currDate, uuid));
        downSocket.send(getWSText(currDate, uuid, lang, voice, volume, rate, pitch, style, role, content));
        downSocket["pending"] = true;
        downQuene[uuid] = {};
        downQuene[uuid]["name"] = content;
        downQuene[uuid]["key"] = key;
        downQuene[uuid]["blob"] = [];
    }
}
const NoMSEPending = (key) => {
    return new Promise((res, rej) => {
        let bufArray = [];
        voiceSocket.onmessage = (e) => {
            if (e.data instanceof ArrayBuffer) {
                bufArray.push(e.data.slice(130));
            } else if (e.data.indexOf("Path:turn.end") !== -1) {
                voiceSocket["pending"] = false;
                if (!(bufArray.length === 1 && bufArray[0].byteLength === 0)) {
                    voiceData[key] = new Blob(bufArray, {type: voiceMIME});
                    res(voiceData[key]);
                } else {
                    res(new Blob());
                }
            }
        }
    })
}
const pauseEv = () => {
    if (voiceIns.src) {
        let ele = chatlog.children[systemRole ? currentVoiceIdx - 1 : currentVoiceIdx].querySelector('.optionItems').lastChild;
        ele.classList.remove("readyVoice");
        ele.classList.remove("pauseVoice");
        ele.classList.add("resumeVoice");
    }
}
const resumeEv = () => {
    if (voiceIns.src) {
        let ele = chatlog.children[systemRole ? currentVoiceIdx - 1 : currentVoiceIdx].querySelector('.optionItems').lastChild;
        ele.classList.remove("readyVoice");
        ele.classList.remove("resumeVoice");
        ele.classList.add("pauseVoice");
    }
}
const speechEvent = async (idx) => {
    if (!data[idx]) return;
    endSpeak();
    currentVoiceIdx = idx;
    if (!data[idx].content && enableContVoice) {
        if (currentVoiceIdx !== data.length - 1) {return speechEvent(currentVoiceIdx + 1)}
        else {return endSpeak()}
    };
    let type = data[idx].role === "user" ? 0 : 1;
    chatlog.children[systemRole ? idx - 1 : idx].classList.add("showVoiceCls");
    let voiceIconEle = chatlog.children[systemRole ? idx - 1 : idx].querySelector('.optionItems').lastChild;
    voiceIconEle.className = "optionItem pauseVoice";
    let content = data[idx].content;
    let volume = voiceVolume[type];
    let rate = voiceRate[type];
    let pitch = voicePitch[type];
    let style = azureStyle[type];
    let role = azureRole[type];
    if (existVoice >= 2) {
        if (!voiceIns || voiceIns instanceof Audio === false) {
            voiceIns = new Audio();
            voiceIns.onpause = pauseEv;
            voiceIns.onplay = resumeEv;
        }
        let voice = existVoice === 3 ? voiceRole[type].ShortName : voiceRole[type].Name;
        let key = content + voice + volume + rate + pitch + (style ? style : "") + (role ? role : "");
        let currData = voiceData[key];
        if (currData) {
            voiceIns.src = URL.createObjectURL(currData);
        } else {
            let mediaSource;
            if (supportMSE) {
                mediaSource = new MediaSource;
                voiceIns.src = URL.createObjectURL(mediaSource);
                await initStreamVoice(mediaSource);
                if (!sourceBuffer) {
                    sourceBuffer = mediaSource.addSourceBuffer(voiceMIME);
                }
                sourceBuffer.onupdateend = function () {
                    speechPushing = false;
                    if (speechQuene.length) {
                        let buf = speechQuene.shift();
                        if (buf["end"]) {
                            if (!sourceBuffer.buffered.length) notyf.open({type: "warning", message: translations[locale]["cantSpeechTip"]});
                            mediaSource.endOfStream();
                        } else {
                            speechPushing = true;
                            sourceBuffer.appendBuffer(buf);
                        }
                    }
                };
                let bufArray = [];
                voiceSocket.onmessage = (e) => {
                    if (e.data instanceof ArrayBuffer) {
                        let buf = e.data.slice(130);
                        bufArray.push(buf);
                        speechQuene.push(buf);
                    } else if (e.data.indexOf("Path:turn.end") !== -1) {
                        voiceSocket["pending"] = false;
                        if (!(bufArray.length === 1 && bufArray[0].byteLength === 0)) voiceData[key] = new Blob(bufArray, {type: voiceMIME});
                        if (!speechQuene.length && !speechPushing) {
                            mediaSource.endOfStream();
                        } else {
                            let buf = new ArrayBuffer();
                            buf["end"] = true;
                            speechQuene.push(buf);
                        }
                    }
                }
            } else {
                await initSocket();
            }
            let currDate = getTime();
            let lang = voiceRole[type].lang;
            let uuid = uuidv4();
            if (existVoice === 3) {
                voiceSocket.send(getWSPre(currDate, uuid));
            }
            voiceSocket.send(getWSAudio(currDate, uuid));
            voiceSocket.send(getWSText(currDate, uuid, lang, voice, volume, rate, pitch, style, role, content));
            voiceSocket["pending"] = true;
            if (!supportMSE) {
                let blob = await NoMSEPending(key);
                if (blob.size === 0) notyf.open({type: "warning", message: translations[locale]["cantSpeechTip"]});
                voiceIns.src = URL.createObjectURL(blob);
            }
        }
    } else {
        voiceIns = new SpeechSynthesisUtterance();
        voiceIns.voice = voiceRole[type];
        voiceIns.volume = volume;
        voiceIns.rate = rate;
        voiceIns.pitch = pitch;
        voiceIns.text = content;
    }
    await speakEvent(voiceIns);
    if (enableContVoice) {
        if (currentVoiceIdx !== data.length - 1) {return speechEvent(currentVoiceIdx + 1)}
        else {endSpeak()}
    }
};
let autoVoiceSocket;
let autoMediaSource;
let voiceContentQuene = [];
let voiceEndFlagQuene = [];
let voiceBlobURLQuene = [];
let autoOnlineVoiceFlag = false;
const autoAddQuene = () => {
    if (voiceContentQuene.length) {
        let content = voiceContentQuene.shift();
        let currDate = getTime();
        let uuid = uuidv4();
        let voice = voiceRole[1].Name;
        if (existVoice === 3) {
            autoVoiceSocket.send(getWSPre(currDate, uuid));
            voice = voiceRole[1].ShortName;
        }
        autoVoiceSocket.send(getWSAudio(currDate, uuid));
        autoVoiceSocket.send(getWSText(currDate, uuid, voiceRole[1].lang, voice, voiceVolume[1], voiceRate[1], voicePitch[1], azureStyle[1], azureRole[1], content));
        autoVoiceSocket["pending"] = true;
        autoOnlineVoiceFlag = true;
    }
}
const autoSpeechEvent = (content, ele, force = false, end = false) => {
    if (ele.querySelector('.optionItems').lastChild.classList.contains("readyVoice")) {
        ele.classList.add("showVoiceCls");
        ele.querySelector('.optionItems').lastChild.className = "optionItem pauseVoice";
    }
    //跳过##

    content=content.replace(/[*#]/g, '');
 
    if (existVoice >= 2) {
        voiceContentQuene.push(content);
        voiceEndFlagQuene.push(end);
        if (!voiceIns || voiceIns instanceof Audio === false) {
            voiceIns = new Audio();
            voiceIns.onpause = pauseEv;
            voiceIns.onplay = resumeEv;
        }
        if (!autoVoiceSocket || autoVoiceSocket.readyState > 1) {
            autoVoiceSocket = new WebSocket(existVoice === 3 ? getAzureWSURL() : edgeTTSURL);
            autoVoiceSocket.binaryType = "arraybuffer";
            autoVoiceSocket.onopen = () => {
                autoAddQuene();
            };
            autoVoiceSocket.onerror = () => {
                autoOnlineVoiceFlag = false;
            };
        };
        let bufArray = [];
        autoVoiceSocket.onmessage = (e) => {
           
            if (e.data instanceof ArrayBuffer) {
                (supportMSE ? speechQuene : bufArray).push(e.data.slice(130));
            } else {
                if (e.data.indexOf("Path:turn.end") !== -1) {
                    autoVoiceSocket["pending"] = false;
                    autoOnlineVoiceFlag = false;
                    if (!supportMSE) {
                        let blob = new Blob(bufArray, {type: voiceMIME});
                        bufArray = [];
                        if (blob.size) {
                            let blobURL = URL.createObjectURL(blob);
                            if (!voiceIns.src) {
                                voiceIns.src = blobURL;
                                voiceIns.play();
                            } else {
                                voiceBlobURLQuene.push(blobURL);
                            }
                        } else {
                            notyf.open({type: "warning", message: translations[locale]["cantSpeechTip"]});
                        }
                        autoAddQuene();
                    }
                    if (voiceEndFlagQuene.shift()) {
                        if (supportMSE) {
                            if (!speechQuene.length && !speechPushing) {
                                autoMediaSource.endOfStream();
                            } else {
                                let buf = new ArrayBuffer();
                                buf["end"] = true;
                                speechQuene.push(buf);
                            }
                        } else {
                            if (!voiceBlobURLQuene.length && !voiceIns.src) {
                                endSpeak();
                            } else {
                                voiceBlobURLQuene.push("end");
                            }
                        }
                    };
                    if (supportMSE) {
                        autoAddQuene();
                    }
                }
            }
        };
        if (!autoOnlineVoiceFlag && autoVoiceSocket.readyState) {
            autoAddQuene();
        }
        if (supportMSE) {
            if (!autoMediaSource) {
                autoMediaSource = new MediaSource();
                autoMediaSource.onsourceopen = () => {
                    if (!sourceBuffer) {
                        sourceBuffer = autoMediaSource.addSourceBuffer(voiceMIME);
                        sourceBuffer.onupdateend = () => {
                            speechPushing = false;
                            if (speechQuene.length) {
                                let buf = speechQuene.shift();
                                if (buf["end"]) {
                                    if (!sourceBuffer.buffered.length) notyf.open({type: "warning", message: translations[locale]["cantSpeechTip"]});
                                    autoMediaSource.endOfStream();
                                } else {
                                    speechPushing = true;
                                    sourceBuffer.appendBuffer(buf);
                                }
                            }
                        };
                    }
                }
            }
            if (!voiceIns.src) {
                voiceIns.src = URL.createObjectURL(autoMediaSource);
                voiceIns.play();
                voiceIns.onended = voiceIns.onerror = () => {
                    endSpeak();
                }
            }
        } else {
            voiceIns.onended = voiceIns.onerror = () => {
                if (voiceBlobURLQuene.length) {
                    let src = voiceBlobURLQuene.shift();
                    if (src === "end") {
                        endSpeak();
                    } else {
                        voiceIns.src = src;
                        voiceIns.currentTime = 0;
                        voiceIns.play();
                    }
                } else {
                    voiceIns.currentTime = 0;
                    voiceIns.removeAttribute("src");
                }
            }
        }
    } else {
        voiceIns = new SpeechSynthesisUtterance(content);
        voiceIns.volume = voiceVolume[1];
        voiceIns.rate = voiceRate[1];
        voiceIns.pitch = voicePitch[1];
        voiceIns.voice = voiceRole[1];
        speakEvent(voiceIns, force, end);
    }
};
const confirmAction = (prompt) => {
    if (window.confirm(prompt)) {return true}
    else {return false}
};
let autoVoiceIdx = 0;
let autoVoiceDataIdx;
let controller;
let controllerId;
let refreshIdx;
let currentResEle;
let progressData = "";
const streamGen = async (long,append) => {
    controller = new AbortController();
    controllerId = setTimeout(() => {
        notyf.error(translations[locale]["timeoutTip"]);
        stopLoading();
    }, 120000);
    let isRefresh = refreshIdx !== void 0;
    if (isRefresh) {
        currentResEle = chatlog.children[systemRole ? refreshIdx - 1 : refreshIdx];
    } else if (!currentResEle) {
        currentResEle = createConvEle("response", true, modelVersion);
        currentResEle.children[1].innerHTML = "<p class='cursorCls'><br /> </p>"; 
        currentResEle.dataset.loading = true;
        // scrollToBottom();
        messagesEle.scrollTo(0, messagesEle.scrollHeight);
    }
    let idx = isRefresh ? refreshIdx : data.length;
    if (existVoice && enableAutoVoice && !long) {
        if (isRefresh) {
            endSpeak();
            autoVoiceDataIdx = currentVoiceIdx = idx;
        } else if (currentVoiceIdx !== data.length) {
            endSpeak();
            autoVoiceDataIdx = currentVoiceIdx = idx;
        }
    };
    try {
        let dataSlice=[];
        if(!append){
            if (long) {
                idx = isRefresh ? refreshIdx : data.length - 1;
                dataSlice = [data[idx - 1], data[idx]];
                if (systemRole) dataSlice.unshift(data[0]);
            } else {
                let startIdx = idx > contLen ? idx - contLen - 1 : 0;
                dataSlice = data.slice(startIdx, idx);
                if (systemRole && startIdx > 0) dataSlice.unshift(data[0]);
            }
            dataSlice = dataSlice.map(item => {
                if (item.role === "assistant") return {role: item.role, content: item.content};
                else return item;
            })
        }
        else{ //进行一次追问    
            let appendMsg = {role: "system", content: append };
            dataSlice.push(appendMsg);
        }
        let conversationPrompt = {role: "system", content: "\n非问勿答，现在时间:"+ new Date().toLocaleString('zh-CN') };
        dataSlice[0].content+=conversationPrompt
        // dataSlice.unshift(conversationPrompt);
        // PreConnection();
        let headers = {"Content-Type": "application/json"};
        if (customAPIKey) headers["Authorization"] = "Bearer " + customAPIKey;
        const res = await fetch(apiHost + API_URL, {
            method: "POST",
            headers,
            body: JSON.stringify({
                messages: dataSlice,
                model: modelVersion,
                stream: true,
                temperature: roleTemp,
                top_p: roleNature
            }),
            signal: controller.signal
        });
        clearTimeout(controllerId);
        controllerId = void 0;
        if (res.status !== 200) {
            if (res.status === 401) {
                notyf.error(translations[locale]["errorAiKeyTip"])
            } else if (res.status === 400 || res.status === 413) {
                notyf.error(translations[locale]["largeReqTip"]);
            } else if (res.status === 404) {
                notyf.error(translations[locale]["noModelPerTip"]);
            } else if (res.status === 429) {
                notyf.error(res.statusText ? translations[locale]["apiRateTip"] : translations[locale]["exceedLimitTip"]);
            } else {
                notyf.error(translations[locale]["badGateTip"]);
            }
            stopLoading();
            return;
        }
        const decoder = new TextDecoder();
        const reader = res.body.getReader();
        const readChunk = async () => {
            return reader.read().then(async ({value, done}) => {
                if (!done) {
                    value = decoder.decode(value);
                    let chunks = value.match(/[^\n]+/g);
                    if (!chunks) return readChunk();
                    for (let i = 0; i < chunks.length; i++) {
                        let chunk = chunks[i];
                        if (chunk) {
                            let payload;
                            try {
                                payload = JSON.parse(chunk.slice(6));
                            } catch (e) {
                                break;
                            }
                            if (payload.choices[0].finish_reason) {
                                let lenStop = payload.choices[0].finish_reason === "length";
                                let longReplyFlag = enableLongReply && lenStop;
                                let ele = currentResEle.lastChild.children[0].children[0];
                                if (!enableLongReply && lenStop) {ele.className = "halfRefReq optionItem"; ele.title = translations[locale]["continue"]}
                                else {ele.className = "refreshReq optionItem"; ele.title = translations[locale]["refresh"]};
                                if (existVoice && enableAutoVoice && currentVoiceIdx === autoVoiceDataIdx) {
                                    let voiceText = longReplyFlag ? "" : progressData.slice(autoVoiceIdx), stop = !longReplyFlag;
                                    autoSpeechEvent(voiceText, currentResEle, false, stop);
                                }
                                break;
                            } else {
                                let content = payload.choices[0].delta.content;////////////////////
                                let spliter;
                                if (content) {
                                    if (!progressData && !content.trim()) continue;
                                    if (existVoice && enableAutoVoice && currentVoiceIdx === autoVoiceDataIdx) {
                                        if (autoVoiceIdx==0)
                                            { spliter = content.match(/[,;!?，。：；！？\n\r\t]/);}
                                        else
                                            { spliter = content.match(/[;!?。：；！？\n\r\t]/);}
                                        if (spliter) {
                                            let voiceText = progressData.slice(autoVoiceIdx) + content.slice(0, spliter.index + 1);
                                            autoVoiceIdx += voiceText.length;
                                            autoSpeechEvent(voiceText, currentResEle);
                                        }
                                    }
                                    if (progressData) await delay();
                                    progressData += content;
                                    currentResEle.children[1].innerHTML = md.render(progressData);
                                    if (!isRefresh) {
                                        scrollToBottom();
                                    }
                                }
                            }
                        }
                    }
                    return readChunk();
                } else {
                    if (isRefresh) {
                        data[refreshIdx].content = progressData;
                        if (longReplyFlag) return streamGen(true);
                    } else {
                        if (long) {data[data.length - 1].content = progressData}
                        else {data.push({role: "assistant", content: progressData, model: modelVersion})}
                        if (longReplyFlag) return streamGen(true);
                    }
                    stopLoading(false);
                }
            });
        };
        await readChunk();
    } catch (e) {
        if (e.message.indexOf("aborted") === -1) {
            notyf.error(translations[locale]["badEndpointTip"])
            stopLoading();
        }
    }
};
const loadAction = (bool) => {
    loading = bool;
    sendBtnEle.disabled = bool;
    sendBtnEle.className = bool ? " loading" : "loaded";
    stopEle.style.display = bool ? "flex" : "none";
    textInputEvent();
};
const updateChatPre = () => {
    let ele = activeChatEle.children[1].children[1];
    let first = data.find(item => {return item.role === "assistant"});
    ele.textContent = first ? first.content.slice(0, 30) : "";
    forceRepaint(ele.parentElement)
}
const stopLoading = (abort = true) => {
    stopEle.style.display = "none";
    if (currentResEle.children[1].querySelector(".cursorCls")) currentResEle.children[1].innerHTML = "<br />";
    if (abort) {
        controller.abort();
        if (controllerId) clearTimeout(controllerId);
        if (delayId) clearTimeout(delayId);
        if (refreshIdx !== void 0) {data[refreshIdx].content = progressData}
        else if (data[data.length - 1].role === "assistant") {data[data.length - 1].content = progressData}
        else {data.push({role: "assistant", content: progressData, model: modelVersion})}
        if (existVoice && enableAutoVoice && currentVoiceIdx === autoVoiceDataIdx && progressData.length) {
            let voiceText = progressData.slice(autoVoiceIdx);
            autoSpeechEvent(voiceText, currentResEle, false, true);
        }
    }
    if (activeChatEle.children[1].children[1].textContent === "") updateChatPre();
    updateChats();
    controllerId = delayId = refreshIdx = autoVoiceDataIdx = void 0;
    autoVoiceIdx = 0;
    currentResEle.dataset.loading = false;
    currentResEle = null;
    progressData = "";
    loadAction(false);
};
const generateText = (message) => {
    loadAction(true);
    let requestEle;
    let isBottom = isContentBottom();
    if (editingIdx !== void 0) {
        let idx = editingIdx;
        let eleIdx = systemRole ? idx - 1 : idx;
        requestEle = chatlog.children[eleIdx];
        data[idx].content = message;
        resumeSend();
        if (idx !== data.length - 1) {
            requestEle.children[0].textContent = message;
            if (data[idx + 1].role !== "assistant") {
                if (currentVoiceIdx !== void 0) {
                    if (currentVoiceIdx > idx) {currentVoiceIdx++}
                }
                data.splice(idx + 1, 0, {role: "assistant", content: "", model: modelVersion});
                chatlog.insertBefore(createConvEle("response", false, modelVersion), chatlog.children[eleIdx + 1]);
            }
            chatlog.children[eleIdx + 1].children[1].innerHTML = "<p class='cursorCls'><br /></p>";
            chatlog.children[eleIdx + 1].dataset.loading = true;
            idx = idx + 1;
            data[idx].content = "";
            if (idx === currentVoiceIdx) {endSpeak()};
            refreshIdx = idx;
            updateChats();
            streamGen();
            return;
        }
    } else {
        requestEle = createConvEle("request");
        data.push({role: "user", content: message});
    }
    requestEle.children[0].textContent = message;
    if (chatsData[activeChatIdx].name === translations[locale]["newChatName"]) {
        if (message.length > 20) message = message.slice(0, 17) + "...";
        chatsData[activeChatIdx].name = message;
        activeChatEle.children[1].children[0].textContent = message;
    }
    updateChats();
    if (isBottom) messagesEle.scrollTo(0, messagesEle.scrollHeight);
    streamGen();
};
inputAreaEle.onkeydown = (e) => {
    if (e.keyCode === 13 && !e.shiftKey) {
        e.preventDefault();
        genFunc();
    } else if (keepListenMic && recing) {
        resetRecRes();
    }
};

const genFunc = function () {
    clearAutoSendTimer();
    if (!keepListenMic && recing) {
        toggleRecEv();
    }
    let message = inputAreaEle.value.trim();
    if (message.length !== 0 && noLoading()) {
        inputAreaEle.value = "";
        inputAreaEle.style.height = "47px";
        if (keepListenMic && recing) resetRecRes();
        generateText(message);
    }
};
sendBtnEle.onclick = genFunc;
stopEle.onclick = stopLoading;
clearEle.onclick = () => {
    if (editingIdx === void 0) {
        if (noLoading() && confirmAction(translations[locale]["clearChatTip"])) {
            endSpeak();
            if (systemRole) {data.length = 1}
            else {data.length = 0}
            chatlog.innerHTML = "";
            
            updateChatPre();
            updateChats();
        }
    } else {
        resumeSend();
    }
}
////////////////////////////////
let PreConnected = false; // 等待标志

async function PreConnection() {// 预连接
    // fetch(apiHost, {
    //     method: 'GET',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //   });
    autoVoiceEle = document.getElementById("enableAutoVoice");
    if(existVoice >= 2 && autoVoiceEle.checked && !PreConnected ){
        // PreConnected = true;
        if (voiceIns && !voiceIns.paused) return; 
        if (autoVoiceSocket && autoVoiceSocket.speaking) return; 
        if (!voiceIns || voiceIns instanceof Audio === false) {
            voiceIns = new Audio();
            voiceIns.onpause = pauseEv;
            voiceIns.onplay = resumeEv;
        }
        if (!autoVoiceSocket || autoVoiceSocket.readyState > 1) {
            autoVoiceSocket = new WebSocket(existVoice === 3 ? getAzureWSURL() : edgeTTSURL);
            autoVoiceSocket.binaryType = "arraybuffer";
            autoVoiceSocket.onopen = () => {
                autoAddQuene();
            };
            autoVoiceSocket.onerror = () => {
                autoOnlineVoiceFlag = false;
            };
        };

        autoVoiceSocket.onmessage = async (e) => {

            return;

        };

    }
}
