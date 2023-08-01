        // 获取自定义菜单元素
    var customMenu = document.getElementById('custom-menu');
    var parentElement = document.getElementById('chatlog');
    var appendMssageText="";
    var selectedText="";
    var Menu_X,Menu_Y;


    // 添加selectionchange事件监听器
    // document.addEventListener('selectionchange', handleSelectionChange);
    // //  // 获取文本选择改变时的回调函数
    //  function handleSelectionChange(event) {
    //     selectedText = window.getSelection().toString();
    //         if(selectedText==""){
    //             hideCustomMenu();
    //             return;}
    //         var target =   window.getSelection().focusNode;
    //         // 检查目标元素是否是父元素的后代
    //         const isDescendant = parentElement.contains(target);
    //         if (isDescendant) {
    //             getCursorPosition(target)
    //             // showCustomMenu(target.changedTouches[0].pageX, target.changedTouches[0].pageY+10);
    //             showCustomMenu(Menu_X, Menu_Y);
    //             appendMssageText=target.textContent;
    //         } else {
    //             hideCustomMenu();
    //         }
    //   }
  
 

 

    //   function getCursorPosition(target) {
    //     // const cursorPositionTextElement = document.getElementById('cursorPositionText');
    //     const selection = window.getSelection();
    //     const range = document.createRange();
    //     if (selection.rangeCount > 0) {
    //         range.setStart(target, selection.focusOffset);
    //         range.collapse(true);
    //         const rect = range.getClientRects()[0];
    //         Menu_X = rect.left;
    //         Menu_Y = rect.top;
    //         // 以下是光标的位置坐标
    //         console.log('光标位置 X:', Menu_X);
    //         console.log('光标位置 Y:', Menu_Y);
    //     } else {
    //         console.log('没有获取到光标位置。');
    //     }
    // }
     //////////////////////////////////////////////////////////////////////////////   
        
    if(isMobile){
        // 监听文本选择事件
        document.addEventListener('touchend', function (event) {
            selectedText=getSelectedText() ;
            var target = event.target;
            // 检查目标元素是否是父元素的后代
            const isDescendant = parentElement.contains(target);
            if (selectedText && isDescendant) {
                // showCustomMenu(event.pageX, event.pageY+10);
                event.stopPropagation();  
                showCustomMenu(event.changedTouches[0].pageX, event.changedTouches[0].pageY+10);
                  
                appendMssageText=target.innerText;
            } else {
                hideCustomMenu();
            }
        });

        const menuUpEvent = (event) => {
            // ev.preventDefault();
            var target = event.target;
            if (target == document.querySelector("#menu_appendAsk")){askForExplanation();}
            if (target == document.querySelector("#menu_copy")){copyText();}
            if (target == document.querySelector("menu_serch")){searchOnBaidu();}
        }

        customMenu.ontouchend = menuUpEvent;


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
