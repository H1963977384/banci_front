/**
 * 珠海公交时刻表查询系统 - 逻辑处理
 */

// 配置项：如果以后换了后端地址，只改这里即可
const API_BASE_URL = "https://banci-4o6a.onrender.com/api/timetable";

// 1. 页面加载初始化
window.onload = function() {
    initDatePicker();
    // 绑定查询按钮点击事件
    document.getElementById('searchBtn').addEventListener('click', fetchData);
};

/**
 * 初始化日期选择器范围（昨天至90天前）
 */
function initDatePicker() {
    const dateInput = document.getElementById('dateInput');
    const displayDate = document.getElementById('displayDate');
    const now = new Date();
    
    // 计算昨天
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // 计算90天前
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setDate(now.getDate() - 90);
    const minDateStr = threeMonthsAgo.toISOString().split('T')[0];
    
    dateInput.max = yesterdayStr;
    dateInput.min = minDateStr;
    dateInput.value = yesterdayStr;
    displayDate.innerText = yesterdayStr;
}

/**
 * 核心抓取函数
 */
async function fetchData() {
    const routeInput = document.getElementById('routeInput');
    const dateInput = document.getElementById('dateInput');
    const searchBtn = document.getElementById('searchBtn');
    const tableBody = document.getElementById('tableBody');
    const mainTitle = document.getElementById('main_title');

    const route = routeInput.value.trim();
    const date = dateInput.value;
    
    if (!route) {
        alert("请输入线路号");
        return;
    }

    // 状态更新：锁定按钮
    searchBtn.innerText = "正在查询...";
    searchBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}?route=${route}&date=${date}`);
        const data = await response.json();

        if (data.error) { 
            alert(data.error); 
            return; 
        }

        // 2. 动态计算总跨列数并更新标题
        const totalCols = 1 + data.max_up + data.max_down;
        mainTitle.colSpan = totalCols;
        mainTitle.innerText = `${route}路运行时刻表`;
        document.getElementById('displayDate').innerText = date;

        // 3. 更新上下行站名
        const upNameCell = document.getElementById('up_name');
        const downNameCell = document.getElementById('down_name');
        
        upNameCell.innerText = data.up_station || "上行";
        upNameCell.colSpan = data.max_up;
        downNameCell.innerText = data.down_station || "下行";
        downNameCell.colSpan = data.max_down;

        // 4. 更新序号行 (1, 2, 3...)
        let headerHtml = "";
        for(let i = 1; i <= data.max_up; i++) {
            headerHtml += `<th class="p-2 border-r w-20 bg-gray-50">${i}</th>`;
        }
        for(let i = 1; i <= data.max_down; i++) {
            headerHtml += `<th class="p-2 border-r w-20 bg-gray-50">${i}</th>`;
        }
        document.getElementById('headerRow1').innerHTML = headerHtml;

        // 5. 渲染表格行数据
        let rowsHtml = "";
        data.table_data.forEach((row, index) => {
            rowsHtml += `<tr class="table-stripe border-b">
                <td class="p-3 border-r font-medium bg-gray-50">${index + 1}</td>`;
            
            // 渲染上行时间
            row.up_times.forEach(t => {
                rowsHtml += `<td class="p-2 border-r">${t}</td>`;
            });
            
            // 渲染下行时间
            row.down_times.forEach(t => {
                rowsHtml += `<td class="p-2 border-r">${t}</td>`;
            });
            rowsHtml += `</tr>`;
        });
        tableBody.innerHTML = rowsHtml;

    } catch (err) {
        console.error("Fetch error:", err);
        alert("获取数据失败，请稍后重试。");
    } finally {
        searchBtn.innerText = "🔍 查询";
        searchBtn.disabled = false;
    }
}
