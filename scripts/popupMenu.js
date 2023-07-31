        // 获取自定义菜单元素
        var customMenu = document.getElementById('custom-menu');
        var appendMssageText=""
        // 监听文本选择事件
        document.addEventListener('mouseup', function (event) {
            var target = event.target;
            var parentElement = document.getElementById('chatlog');
            // 检查目标元素是否是父元素的后代
            const isDescendant = parentElement.contains(target);
            if (isDescendant) {
                showCustomMenu(event.pageX, event.pageY+10);
                appendMssageText=target.innerText;
            } else {
                hideCustomMenu();
            }

        });
    
        // 阻止默认右键菜单事件
        document.addEventListener('contextmenu', function (event) {
            event.preventDefault();
        });
    
        // 获取选择的文本内容
        function getSelectedText() {
            return window.getSelection().toString();
        }
    
        // 显示自定义菜单
        function showCustomMenu(x, y) {
            customMenu.style.display = 'block';
            customMenu.style.left = x + 'px';
            customMenu.style.top = y + 'px';
        }
    
        // 隐藏自定义菜单
        function hideCustomMenu() {
            customMenu.style.display = 'none';
        }
    
        // 自定义菜单选项 - 追问详解
        function askForExplanation() {
            var selectedText = getSelectedText();
            
            // 在这里实现追问详解的逻辑，这里简化为在控制台输出选中文本

            if (selectedText.length !== 0 && noLoading()) {

                selectedText="\n请详细解释其中的以下内容：\n" + selectedText
                appendMssageText="前文你说道：" + appendMssageText + selectedText
                streamGen( false, appendMssageText);
                appendMssageText=""
            }
            console.log('追问详解：', selectedText);
            hideCustomMenu();
        }
    
        // 自定义菜单选项 - 复制文本
        function copyText() {
            var selectedText = getSelectedText();

            // 创建一个隐藏的textarea元素
            var textarea = document.createElement('textarea');
            textarea.style.position = 'absolute';
            textarea.style.left = '-9999px';
            textarea.style.top = '-9999px';
            textarea.value = selectedText;

            // 将textarea添加到文档中
            document.body.appendChild(textarea);

            // 选中textarea中的文本
            textarea.select();

            // 复制文本到剪贴板
            document.execCommand('copy');

            // 从文档中移除textarea元素
            document.body.removeChild(textarea);

            hideCustomMenu();
        }
    
        // 自定义菜单选项 - 百度搜索
        function searchOnBaidu() {
            var selectedText = getSelectedText();
            // 使用encodeURIComponent对文本进行编码，以便在URL中传递
            var encodedText = encodeURIComponent(selectedText);
            // 构造百度搜索链接
            var searchLink = 'https://www.baidu.com/s?wd=' + encodedText;
            // 在新窗口中打开百度搜索链接
            window.open(searchLink, '_blank');
            hideCustomMenu();
        }