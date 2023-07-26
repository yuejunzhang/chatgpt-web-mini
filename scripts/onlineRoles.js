let downRoleController = new AbortController();
const loadPrompt = () => {
    downRoleController.abort();
    downRoleController = new AbortController();
    setTimeout(() => {
        downRoleController.abort();
    }, 10000);
    preEle.options.length = 5;
    if (locale === "zh") {
        fetch("https://cdn.jsdelivr.net/gh/PlexPt/awesome-chatgpt-prompts-zh/prompts-zh.json", {
            signal: downRoleController.signal
        }).then(async (response) => {
            let res = await response.json();
            for (let i = 0; i < res.length; i++) {
                let key = "act" + i;
                presetRoleData[key] = res[i].prompt.trim();
                let optionEle = document.createElement("option");
                optionEle.text = res[i].act;
                optionEle.value = key;
                preEle.options.add(optionEle);
            }
        }).catch(e => { })
    } else {
        fetch("https://cdn.jsdelivr.net/gh/f/awesome-chatgpt-prompts/prompts.csv", {
            signal: downRoleController.signal
        }).then(async (response) => {
            let res = await response.text();
            let arr = res.split("\n");
            for (let i = 1; i < arr.length - 1; i++) {
                let key = "act" + i;
                let index = arr[i].indexOf(",");
                presetRoleData[key] = arr[i].slice(index + 2, -1);
                let optionEle = document.createElement("option");
                optionEle.text = arr[i].slice(1, index - 1);
                optionEle.value = key;
                preEle.options.add(optionEle);
            }
        }).catch(e => { })
    }
}
loadPrompt();