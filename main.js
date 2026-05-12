/**
 * 珠海公交时刻表查询系统 - 逻辑处理
 */

const API_BASE_URL = "https://banci-4o6a.onrender.com/api/timetable";
const CHECK_AUTH_URL = "https://banci-4o6a.onrender.com/api/check_auth";

// 1. 页面加载初始化
window.onload = function() {
    initDatePicker();
    // 绑定查询按钮点击事件
    document.getElementById('searchBtn').addEventListener('click', fetchData);
};

/**
 * 获取或生成设备唯一标识 (浏览器指纹)
 */
function getFingerprint() {
    let id = localStorage.getItem('device_id');
    if (!id) {
        // 生成一个包含时间戳的随机字符串
        id = 'DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase() + Date.now().toString().slice(-4);
        localStorage.setItem('device_id', id);
    }
    return id;
}

/**
 * 身份验证逻辑：判断设备是否已绑定
 */
async function ensureAuth() {
    const deviceId = getFingerprint();
    let inviteCode = localStorage.getItem('invite_code');

    // 如果本地已经存了码，先静默尝试验证
    if (inviteCode) {
        try {
            const res = await fetch(`${CHECK_AUTH_URL}?code=${inviteCode}&device_id=${deviceId}`);
            if (res.ok) return { inviteCode, deviceId }; 
        } catch (e) {
            console.error("验证服务连接失败");
        }
    }

    // 如果本地没码，或者验证失败（比如后端重启后码被重置了，或者码被踢了）
    inviteCode = prompt("该设备尚未绑定，请输入邀请码：");
    if (inviteCode) {
        // 尝试去后端绑定
        try {
            const res = await fetch(`${CHECK_AUTH_URL}?code=${inviteCode}&device_id=${deviceId}`);
            if (res.ok) {
                localStorage.setItem('invite_code', inviteCode);
                alert("绑定成功！");
                return { inviteCode, deviceId };
            } else {
                alert("邀请码无效或已被他人占用");
                localStorage.removeItem('invite_code');
            }
        } catch (e) {
            alert("无法连接到验证服务器");
        }
    }
    return null;
}

/**
 * 初始化日期选择器范围
 */
function initDatePicker() {
    const dateInput = document.getElementById('dateInput');
    const displayDate = document.getElementById('displayDate');
    const now = new Date();
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const minDate = new Date(now);
    minDate.setDate(now.getDate() - 7);
    const minDateStr = minDate.toISOString().split('T')[0];
    
    dateInput.max = yesterdayStr;
    dateInput.min = minDateStr;
    dateInput.value = yesterdayStr;
    displayDate.innerText = yesterdayStr;
}

/**
 * 核心查询函数
 */
async function fetchData() {
    // A. 身份校验拦截
    const auth = await ensureAuth();
    if (!auth) return; // 没过验证就不往下走

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

    searchBtn.innerText = "正在生成...";
    searchBtn.disabled = true;

    try {
        // B. 请求带上 code 和 device_id
        const url = `${API_BASE_URL}?route=${route}&date=${date}&code=${auth.inviteCode}&device_id=${auth.deviceId}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) { 
            alert(data.error || "查询失败");
            // 如果后端返回 403，说明码失效了，清理掉缓存
            if (response.status === 403) localStorage.removeItem('invite_code');
            return; 
        }

        // --- 以下是原有的表格渲染逻辑 ---
        const totalCols = 1 + data.max_up + data.max_down;
        mainTitle.colSpan = totalCols;
        mainTitle.innerText = `${route}路运行时刻表`;
        document.getElementById('displayDate').innerText = date;

        const upNameCell = document.getElementById('up_name');
        const downNameCell = document.getElementById('down_name');
        upNameCell.innerText = data.up_station || "上行";
        upNameCell.colSpan = data.max_up;
        downNameCell.innerText = data.down_station || "下行";
        downNameCell.colSpan = data.max_down;

        let headerHtml = "";
        for(let i = 1; i <= data.max_up; i++) {
            headerHtml += `<th class="p-2 border-r w-20 bg-gray-50 text-gray-600">${i}</th>`;
        }
        for(let i = 0; i < data.max_down; i++) {
            const letter = String.fromCharCode(65 + i); 
            headerHtml += `<th class="p-2 border-r w-20 bg-gray-50 text-gray-600">${letter}</th>`;
        }
        document.getElementById('headerRow1').innerHTML = headerHtml;

        let rowsHtml = "";
        data.table_data.forEach((row, index) => {
            rowsHtml += `<tr class="border-b">
                <td class="p-3 border-r font-medium">${index + 1}</td>`;
            row.up_times.forEach(t => {
                rowsHtml += `<td class="p-2 border-r">${t}</td>`;
            });
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
