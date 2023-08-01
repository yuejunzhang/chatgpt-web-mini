        // 获取自定义菜单元素
    var customMenu = document.getElementById('custom-menu');
    var parentElement = document.getElementById('chatlog');
    var appendMssageText="";
    var selectedText="";
 
  
        
    if(isMobile){
        // 监听文本选择事件
        document.addEventListener('touchend', function (event) {
            selectedText=getSelectedText() ;
            var target = event.target;
            // 检查目标元素是否是父元素的后代
            const isDescendant = parentElement.contains(target);
            if (selectedText && isDescendant) {
                // showCustomMenu(event.pageX, event.pageY+10);
                showCustomMenu(event.changedTouches[0].pageX, event.changedTouches[0].pageY+10);
                appendMssageText=target.innerText;
                alert(selectedText);
            } else {
                hideCustomMenu();
            }
        });
    } 
    else{    
        // 监听文本选择事件
        document.addEventListener('mouseup', function (event) {
            selectedText=getSelectedText() ;
            var target = event.target;
            // 检查目标元素是否是父元素的后代
            const isDescendant = parentElement.contains(target);
            if (selectedText && isDescendant) {
                showCustomMenu(event.pageX, event.pageY+10);
                appendMssageText=target.innerText;
            } else {
                hideCustomMenu();
            }
        });
    }
    /////////////////////////////////////////////////////////////////
        // 阻止默认右键菜单事件
        parentElement.addEventListener('contextmenu', function (event) {
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
            //  selectedText = getSelectedText();
            if (selectedText.length !== 0 && noLoading()) {
                selectedText="\n请详细解释其中的以下内容：\n" + selectedText
                appendMssageText="前文是：" + appendMssageText + selectedText
                streamGen( false, appendMssageText);
                appendMssageText="";
                selectedText="";
            }
            hideCustomMenu();
        }
    
        // 自定义菜单选项 - 复制文本
        function copyText() {
            //  selectedText = getSelectedText();
            // 创建一个隐藏的textarea元素
            var textarea = document.createElement('textarea');
            textarea.style.position = 'absolute';
            textarea.style.left = '-9999px';
            textarea.style.top = '-9999px';
            textarea.value = selectedText;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            hideCustomMenu();
        }
    
        // 自定义菜单选项 - 百度搜索
        function searchOnBaidu() {
            // selectedText = getSelectedText();
            // 使用encodeURIComponent对文本进行编码，以便在URL中传递
            var encodedText = encodeURIComponent(selectedText);
            var searchLink = 'https://www.baidu.com/s?wd=' + encodedText;
            window.open(searchLink, '_blank');
            hideCustomMenu();
        }
