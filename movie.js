// =============================================
//     电影收藏馆 - JavaScript v3.5
// 功能: 编辑时保留观影日期(除非显式更改), 布局优化, 自动获取详情, 按观影日期排序, 全选删除, CSV导入导出, 豆瓣搜索按钮
// =============================================

// --- 全局变量与常量 ---
let currentPage = 1;
const moviesPerPage = 6;
const TMDB_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const TMDB_API_KEY_STORAGE_KEY = 'tmdbApiKey';
const DEFAULT_POSTER_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9IiNFNkYyRkYiIHN0cm9rZT0iIzRhNGI2ZSIgc3Ryb2tlLXdpZHRoPSIxIj48cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHg9IjMiIHk9IjMiIHJ4PSIyIiByeT0iMiIgc3Ryb2tlPSIjOWVhNmJjIiBmaWxsPSIjMmEyYjQ1Ii8+PHBhdGggZD0iTTMgMTJsNi02IDYgNi0zIDMiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlPSIjOWVhNmJjIi8+PGNpcmNsZSBjeD0iOSIgY3k9IjkiIHI9IjEiIGZpbGw9IiM5ZWE2YmMiLz48dGV4dCB4PSI1MHUiIHk9IjcwJSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTZweCIgZmlsbD0iI2U2ZjJmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'; // 默认SVG海报

// --- 初始化与基础功能 ---
/**
 * 初始化本地存储，如果 'movies' 不存在则创建一个空数组。
 */
function initStorage() {
    if (!localStorage.getItem('movies')) {
        localStorage.setItem('movies', JSON.stringify([]));
    }
}

// --- TMDb API 相关功能 ---
/**
 * 从本地存储获取 TMDb API Key。
 * @returns {string | null} API Key 或 null。
 */
function getTmdbApiKey() {
    return localStorage.getItem(TMDB_API_KEY_STORAGE_KEY);
}

/**
 * 保存用户输入的 TMDb API Key 到本地存储。
 */
function saveTmdbApiKey() {
    const apiKeyInput = document.getElementById('tmdbApiKey');
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
        // 简单验证 API Key 格式 (32位字母数字)
        if (/^[a-z0-9]{32}$/i.test(apiKey)) {
             localStorage.setItem(TMDB_API_KEY_STORAGE_KEY, apiKey);
             alert('TMDb API Key 已保存。');
             apiKeyInput.placeholder = "API Key 已保存 (如需更改请重新输入)"; // 更新提示
        } else {
             alert('API Key 格式似乎不正确，请检查（通常是32位字母和数字）。');
        }
    } else {
        // 如果输入为空，则移除存储的 Key
        localStorage.removeItem(TMDB_API_KEY_STORAGE_KEY);
        apiKeyInput.placeholder = "粘贴你的 TMDb API Key 并保存"; // 恢复默认提示
        alert('API Key 已清除。自动获取详情功能将停用。');
    }
}

/**
 * 从 TMDb 获取电影的详细信息（海报、导演、年份、国家）。
 * @param {string} title 电影标题
 * @returns {Promise<{posterUrl: string|null, director: string|null, year: number|null, country: string|null}>} 包含详情的对象，获取失败时值为 null。
 */
async function fetchMovieDetailsFromTmdb(title) {
    const apiKey = getTmdbApiKey();
    const result = { posterUrl: null, director: null, year: null, country: null }; // 初始化结果
    if (!apiKey || !title) { // 如果没有 Key 或标题，直接返回
        console.warn('TMDb API Key or Title missing for fetching details.');
        return result;
    }

    // 1. 搜索电影获取 ID
    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(title)}&language=zh-CN&include_adult=false`;
    let movieId = null;
    try {
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) throw new Error(`TMDb Search API Error (${searchRes.status})`);
        const searchData = await searchRes.json();
        // 如果找到结果，取第一个的 ID
        if (searchData.results?.length > 0) {
            movieId = searchData.results[0].id;
        } else {
            console.log(`No movie match found for "${title}".`);
            return result; // 未找到匹配，直接返回
        }
    } catch (err) {
        console.error(`TMDb Search Error for "${title}":`, err);
        return result; // 搜索出错，直接返回
    }

    // 2. 使用 ID 获取详细信息和演职员表
    if (movieId) {
        const detailsUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&language=zh-CN&append_to_response=credits`;
        try {
            const detailsRes = await fetch(detailsUrl);
            if (!detailsRes.ok) throw new Error(`TMDb Details API Error (${detailsRes.status})`);
            const d = await detailsRes.json(); // d 代表 details data

            // 提取海报路径并构建完整 URL
            if (d.poster_path) result.posterUrl = TMDB_POSTER_BASE_URL + d.poster_path;
            // 提取年份 (从 release_date 截取前4位)
            if (d.release_date) result.year = parseInt(d.release_date.substring(0, 4)) || null;
            // 提取制片国家 (优先取中国或美国，否则取第一个)
            if (d.production_countries?.length > 0) {
                const country = d.production_countries.find(c => c.iso_3166_1 === 'CN') || d.production_countries.find(c => c.iso_3166_1 === 'US') || d.production_countries[0];
                result.country = country?.name || null;
            }
            // 提取导演 (从 credits.crew 筛选 job 为 Director)
            if (d.credits?.crew) {
                const directors = d.credits.crew.filter(c => c.job === 'Director');
                if (directors.length > 0) result.director = directors.map(dir => dir.name).join(', '); // 多个导演用逗号分隔
            }
        } catch (err) {
            console.error(`TMDb Details Error for ID ${movieId}:`, err);
            // 获取详情或演职员出错，不影响之前可能已获取的海报等信息
        }
    }
    console.log(`Fetched TMDb details for "${title}":`, result);
    return result; // 返回包含获取到的信息的对象
}

/**
 * 尝试为所有缺少必要详情（海报、导演、年份、国家）的电影获取信息。
 */
async function fetchAllMissingDetails() {
    if (!getTmdbApiKey()) { alert('请先在设置中输入并保存 TMDb API Key。'); return; }

    let movies = JSON.parse(localStorage.getItem('movies') || '[]');
    // 筛选出需要更新的电影
    const moviesToUpdate = movies.filter(m =>
        (!m.coverUrl || m.coverUrl === DEFAULT_POSTER_URL) || !m.director || !m.year || !m.country
    );
    if (moviesToUpdate.length === 0) { alert('所有电影详情似乎都完整。'); return; }

    // UI 反馈：禁用按钮并显示加载状态
    const fetchButton = document.querySelector('button[onclick="fetchAllMissingDetails()"]');
    const originalButtonContent = fetchButton.innerHTML;
    fetchButton.disabled = true;
    const updateProgressText = (processed, total) => `<svg class="spinner" viewBox="0 0 24 24"><path d="M12 6v2a4 4 0 1 1-4 4H6a6 6 0 1 0 6-6z"/></svg> 获取中 (${processed}/${total})...`;
    fetchButton.innerHTML = updateProgressText(0, moviesToUpdate.length);

    let counts = { movies: 0, poster: 0, director: 0, year: 0, country: 0 }; // 计数器
    const batchSize = 8;       // 每批处理数量
    const delayBetweenBatches = 1200; // 每批间隔时间 (毫秒)，避免触发 API 限制

    // 分批处理
    for (let i = 0; i < moviesToUpdate.length; i += batchSize) {
        const batch = moviesToUpdate.slice(i, i + batchSize);
        console.log(`Fetching details for batch ${Math.floor(i / batchSize) + 1}...`);
        fetchButton.innerHTML = updateProgressText(i, moviesToUpdate.length); // 更新进度显示

        // 并发处理当前批次的电影
        const promises = batch.map(async (movie) => {
            let movieUpdated = false; // 标记当前电影是否被更新了
            try {
                // 检查是否真的需要获取信息
                if ((!movie.coverUrl || movie.coverUrl === DEFAULT_POSTER_URL) || !movie.director || !movie.year || !movie.country) {
                    const details = await fetchMovieDetailsFromTmdb(movie.title);
                    // 找到这条电影在原始数组中的索引，直接修改原数组
                    const movieIndex = movies.findIndex(m => m.id === movie.id);
                    if (movieIndex !== -1) {
                        let posterUpdated = false, directorUpdated = false, yearUpdated = false, countryUpdated = false;
                        // 只有在对应字段为空时才更新
                        if (details.posterUrl && (!movies[movieIndex].coverUrl || movies[movieIndex].coverUrl === DEFAULT_POSTER_URL)) { movies[movieIndex].coverUrl = details.posterUrl; posterUpdated = true; }
                        if (details.director && !movies[movieIndex].director) { movies[movieIndex].director = details.director; directorUpdated = true; }
                        if (details.year && !movies[movieIndex].year) { movies[movieIndex].year = details.year; yearUpdated = true; }
                        if (details.country && !movies[movieIndex].country) { movies[movieIndex].country = details.country; countryUpdated = true; }
                        // 如果有任何字段被更新，标记此电影被更新了
                        if (posterUpdated || directorUpdated || yearUpdated || countryUpdated) movieUpdated = true;
                        // 更新计数器
                        if (posterUpdated) counts.poster++;
                        if (directorUpdated) counts.director++;
                        if (yearUpdated) counts.year++;
                        if (countryUpdated) counts.country++;
                    }
                }
            } catch (err) { console.error(`Fetch error for ${movie.title}:`, err); }
            if (movieUpdated) counts.movies++; // 更新了信息的电影总数
        });

        await Promise.allSettled(promises); // 等待当前批次所有请求完成（无论成功失败）

        // 如果不是最后一批，则等待一段时间再进行下一批
        if (i + batchSize < moviesToUpdate.length) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
    }

    // 所有批次处理完毕，保存更新后的数组到 localStorage
    localStorage.setItem('movies', JSON.stringify(movies));
    renderMovies(); // 重新渲染列表以显示更新

    // 恢复按钮状态并显示结果
    fetchButton.disabled = false;
    fetchButton.innerHTML = originalButtonContent;
    alert(`详情获取完成！\n共 ${counts.movies} 部电影信息被更新。\n(海报:${counts.poster},导演:${counts.director},年份:${counts.year},国家:${counts.country})`);
}


// --- CSV 处理 ---
/**
 * 解析 CSV 文本为电影对象数组。
 * @param {string} csvText CSV 文本内容。
 * @returns {Array<object>} 解析后的电影对象数组。
 * @throws {Error} 如果 CSV 格式无效或缺少必需列。
 */
function parseCSV(csvText) {
    const rows = csvText.split('\n').filter(Boolean); // 按行分割并移除空行
    if (rows.length < 2) throw new Error("CSV 文件至少需要包含表头和一行数据。");

    // 解析表头，移除可能的引号和空格
    const headers = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    console.log("Parsed CSV Headers:", headers);

    // 检查必需的列是否存在
    const requiredHeaders = ['电影/电视剧/番组', '观影日期'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
        throw new Error(`CSV文件缺少必要的列：${missingHeaders.join(', ')}`);
    }

    // 创建表头到列索引的映射，方便按名称取值
    const headerIndex = Object.fromEntries(headers.map((h, i) => [h, i]));
    // 辅助函数，根据表头名安全地获取列值
    const getColumnValue = (columns, headerName) => {
        const index = headerIndex[headerName];
        return index !== undefined && index < columns.length ? columns[index] : ''; // 确保索引有效
    };

    // 解析数据行
    return rows.slice(1).map((row, rowIndex) => {
        // 简单的 CSV 解析逻辑（可能需要对复杂 CSV 做改进）
        const columns = []; let currentVal = ''; let inQuotes = false;
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            // 处理引号，包括转义的双引号 ""
            if (char === '"' && (i === 0 || row[i - 1] !== '\\')) { // 忽略转义的引号 \"
                if (inQuotes && i + 1 < row.length && row[i + 1] === '"') {
                    currentVal += '"'; i++; // 添加一个引号并跳过下一个
                } else { inQuotes = !inQuotes; } // 切换引号状态
            } else if (char === ',' && !inQuotes) { // 如果不在引号内遇到逗号，则分割
                columns.push(currentVal.trim()); currentVal = '';
            } else { currentVal += char; } // 累加字符
        }
        columns.push(currentVal.trim()); // 添加最后一个字段
        // 移除可能残余的首尾引号
        const cleanedColumns = columns.map(col => col.replace(/^"(.*)"$/, '$1').trim());

        // 构建电影对象
        const movie = {
            title: getColumnValue(cleanedColumns, '电影/电视剧/番组'),
            ratingDate: getColumnValue(cleanedColumns, '观影日期'),
            rating: parseFloat(getColumnValue(cleanedColumns, '个人评分')) || null,
            review: getColumnValue(cleanedColumns, '我的短评'),
            year: parseInt((getColumnValue(cleanedColumns, '上映年份') || '').match(/^\d{4}/)?.[0]) || null,
            country: getColumnValue(cleanedColumns, '制片国家'),
            link: getColumnValue(cleanedColumns, '条目链接'),
            director: getColumnValue(cleanedColumns, '导演'),
            coverUrl: getColumnValue(cleanedColumns, '海报URL')
        };

        // 校验必需字段和日期格式
        if (!movie.title || !movie.ratingDate || isNaN(new Date(movie.ratingDate).getTime())) {
            console.warn(`跳过无效的 CSV 行 ${rowIndex + 2}: 缺少标题/观影日期或日期格式无效。行数据:`, row);
            return null; // 返回 null 以便之后过滤掉
        }

        // 返回包含 ID 和创建时间的完整对象
        return { id: Date.now() + Math.random(), ...movie, createdAt: new Date().toISOString() };
    }).filter(Boolean); // 过滤掉解析失败的行 (返回 null 的)
}

/**
 * 导入 CSV 文件，处理数据并尝试获取缺失详情。
 */
async function importCSV() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files.length) { alert('请选择 CSV 文件'); return; }

    // UI 反馈
    const importButton = document.querySelector('button[onclick="importCSV()"]');
    const originalButtonContent = importButton.innerHTML;
    importButton.disabled = true;
    importButton.innerHTML = `<svg class="spinner" viewBox="0 0 24 24"><path d="M12 6v2a4 4 0 1 1-4 4H6a6 6 0 1 0 6-6z"/></svg>导入中...`;

    const reader = new FileReader();
    reader.onload = async (e) => {
        let newMoviesCount = 0, skippedCount = 0, updatedDetailsCount = 0;
        try {
            const importedMovies = parseCSV(e.target.result); // 解析 CSV
            let existingMovies = JSON.parse(localStorage.getItem('movies') || '[]');
            const moviesToAdd = []; // 存储去重后需要添加的电影

            // 去重逻辑
            importedMovies.forEach(newMovie => {
                const isDuplicate = existingMovies.some(existing =>
                    existing.title === newMovie.title &&
                    (existing.year === newMovie.year || (!existing.year && !newMovie.year)) // 年份相同或都为空视为重复
                );
                if (!isDuplicate) moviesToAdd.push(newMovie);
                else skippedCount++;
            });
            newMoviesCount = moviesToAdd.length;

            if (newMoviesCount > 0) {
                const apiKeyExists = !!getTmdbApiKey(); // 检查 API Key
                alert(`找到 ${newMoviesCount} 部新电影${apiKeyExists ? '，将尝试获取缺失详情...' : '。未设置 API Key，不获取详情。'}`);

                // 为新电影获取详情（如果有 Key 且缺少信息）
                const fetchPromises = moviesToAdd.map(async (movie) => {
                    let detailsUpdated = false;
                    if (apiKeyExists && (!movie.coverUrl || !movie.director || !movie.year || !movie.country)) {
                        const details = await fetchMovieDetailsFromTmdb(movie.title); // 尝试获取
                        // 仅当字段为空时更新
                        if (!movie.coverUrl && details.posterUrl) { movie.coverUrl = details.posterUrl; detailsUpdated = true; }
                        if (!movie.director && details.director) { movie.director = details.director; detailsUpdated = true; }
                        if (!movie.year && details.year) { movie.year = details.year; detailsUpdated = true; }
                        if (!movie.country && details.country) { movie.country = details.country; detailsUpdated = true; }
                    }
                    if (detailsUpdated) updatedDetailsCount++; // 计数更新了详情的电影
                    return movie; // 返回（可能已更新的）电影对象
                });

                const finalMoviesToAdd = await Promise.all(fetchPromises); // 等待所有详情获取完成

                // 合并并保存
                localStorage.setItem('movies', JSON.stringify([...existingMovies, ...finalMoviesToAdd]));
                currentPage = 1; // 跳转到第一页
                renderMovies(); // 重新渲染
                alert(`导入完成！\n成功导入 ${newMoviesCount} 部。\n${apiKeyExists ? `其中 ${updatedDetailsCount} 部成功获取/更新了详情。\n` : ''}${skippedCount > 0 ? `跳过 ${skippedCount} 部可能重复的电影。` : ''}`);
            } else {
                alert(`导入完成。未找到新的电影数据可添加。共处理 ${importedMovies.length} 行数据。`);
            }
        } catch (err) {
            console.error("CSV Import Error:", err);
            alert('CSV 处理失败：' + err.message); // 显示具体的错误信息
        } finally {
            // 恢复 UI
            fileInput.value = '';
            document.getElementById('fileName').textContent = '未选择文件';
            importButton.disabled = false;
            importButton.innerHTML = originalButtonContent;
        }
    };
    reader.onerror = (err) => {
        console.error("File Read Error:", err); alert('文件读取失败。');
        // 恢复 UI
        fileInput.value = ''; document.getElementById('fileName').textContent = '未选择文件';
        importButton.disabled = false; importButton.innerHTML = originalButtonContent;
    };
    reader.readAsText(fileInput.files[0], 'UTF-8'); // 明确使用 UTF-8
}

/**
 * 转义 CSV 值中的特殊字符。
 */
function escapeCSVValue(value) {
    if (value == null) return ''; // 处理 null 或 undefined
    let stringValue = String(value);
    // 如果包含逗号、换行符或双引号，则用双引号包围，并将内部双引号转义为两个双引号
    if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        stringValue = stringValue.replace(/"/g, '""'); // 双引号转义
        stringValue = `"${stringValue}"`; // 加引号包围
    }
    return stringValue;
}

/**
 * 导出当前所有电影数据为 CSV 文件。
 */
function exportCSV() {
    const movies = JSON.parse(localStorage.getItem('movies') || '[]');
    if (movies.length === 0) { alert('无电影可导出。'); return; }

    // 先按打分日期降序排序
    movies.sort((a, b) => {
        const dateA = a.ratingDate ? new Date(a.ratingDate) : 0; const dateB = b.ratingDate ? new Date(b.ratingDate) : 0;
        if(isNaN(dateA) && !isNaN(dateB)) return 1; if(!isNaN(dateA) && isNaN(dateB)) return -1; if(isNaN(dateA) && isNaN(dateB)) return 0;
        return dateB - dateA;
    });

    // 定义表头
    const headers = ['电影/电视剧/番组', '个人评分', '观影日期', '我的短评', '上映年份', '制片国家', '条目链接', '导演', '海报URL', '内部ID', '添加日期', '最后修改日期'];

    // 转换数据行
    const csvRows = movies.map(movie => [
        escapeCSVValue(movie.title), escapeCSVValue(movie.rating), escapeCSVValue(movie.ratingDate),
        escapeCSVValue(movie.review), escapeCSVValue(movie.year), escapeCSVValue(movie.country),
        escapeCSVValue(movie.link), escapeCSVValue(movie.director), escapeCSVValue(movie.coverUrl),
        escapeCSVValue(movie.id), escapeCSVValue(movie.createdAt), escapeCSVValue(movie.updatedAt)
    ].join(','));

    // 组合表头和数据行
    const csvString = [headers.join(','), ...csvRows].join('\n');

    // 创建 Blob 并触发下载
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' }); // 添加 BOM
    const link = document.createElement('a');
    if (link.download === undefined) { alert('浏览器不支持自动下载。'); return; } // 检查兼容性
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    link.setAttribute('href', url);
    link.setAttribute('download', `电影收藏_${timestamp}.csv`); // 文件名
    link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url); // 清理
}


// --- 电影增删改查与渲染 ---
/**
 * 添加新电影（只手动输入4个字段，其他自动获取）。
 */
async function addMovie(e) {
    e.preventDefault(); // 阻止表单默认提交
    const addButton = document.querySelector('#addMovieForm button[type="submit"]');
    const originalButtonContent = addButton.innerHTML;

    // 获取用户输入的字段
    const title = document.getElementById('title').value.trim();
    const rating = parseFloat(document.getElementById('rating').value) || null;
    const ratingDate = document.getElementById('ratingDate').value;
    const review = document.getElementById('review').value.trim();

    // 校验必需字段
    if (!title) { alert('电影名称不能为空！'); return; }
    if (!ratingDate) { alert('观影日期不能为空！ (用于排序)'); return; }
    if (isNaN(new Date(ratingDate).getTime())) { alert('观影日期格式无效！'); return; }

    // UI 反馈：禁用按钮，显示加载状态
    addButton.disabled = true;
    addButton.innerHTML = `<svg class="spinner" viewBox="0 0 24 24"><path d="M12 6v2a4 4 0 1 1-4 4H6a6 6 0 1 0 6-6z"/></svg> 处理中...`;

    let fetchedDetails = { posterUrl: null, director: null, year: null, country: null };
    try {
        // 如果有 API Key，尝试获取详情
        if (getTmdbApiKey()) {
            addButton.innerHTML = `<svg class="spinner" viewBox="0 0 24 24"><path d="M12 6v2a4 4 0 1 1-4 4H6a6 6 0 1 0 6-6z"/></svg> 获取详情...`;
            fetchedDetails = await fetchMovieDetailsFromTmdb(title);
        }

        // 构建电影对象
        const movie = {
            id: Date.now(),
            title: title,
            rating: rating,
            ratingDate: ratingDate,
            review: review,
            director: fetchedDetails.director || '', // 使用获取到的，否则为空
            year: fetchedDetails.year || null,      // 使用获取到的，否则为 null
            country: fetchedDetails.country || '',   // 使用获取到的，否则为空
            coverUrl: fetchedDetails.posterUrl || '', // 使用获取到的，否则为空
            link: '',                              // 豆瓣链接初始化为空
            createdAt: new Date().toISOString()
        };

        // 保存到 localStorage
        const movies = JSON.parse(localStorage.getItem('movies') || '[]');
        movies.push(movie);
        localStorage.setItem('movies', JSON.stringify(movies));

        // 更新 UI
        currentPage = 1; // 跳转到第一页显示新添加的
        renderMovies();
        document.getElementById('addMovieForm').reset(); // 重置表单
        alert('电影添加成功！');

    } catch (err) {
         console.error("Add Movie Error:", err);
         alert("添加电影时发生错误，请稍后重试。");
    } finally {
        // 恢复按钮状态
        addButton.disabled = false;
        addButton.innerHTML = originalButtonContent;
    }
}

/**
 * 渲染电影列表到页面。
 */
function renderMovies() {
    let movies = JSON.parse(localStorage.getItem('movies') || '[]');
    const container = document.getElementById('movieList'); container.innerHTML = '';
    document.getElementById('movieCount').textContent = movies.length;

    // 1. 按观影日期降序排序
    movies.sort((a, b) => {
        const dateA = a.ratingDate ? new Date(a.ratingDate) : 0; // 无效日期视为最早
        const dateB = b.ratingDate ? new Date(b.ratingDate) : 0;
        const isValidA = !isNaN(dateA); const isValidB = !isNaN(dateB);
        if (isValidB && !isValidA) return -1; // 有效日期在前
        if (!isValidB && isValidA) return 1;
        if (!isValidB && !isValidA) return 0; // 都无效则保持原始顺序（理论上不应发生，因为添加时校验）
        return dateB - dateA; // 日期降序
    });

    // 2. 处理分页
    const totalMovies = movies.length;
    const totalPages = Math.ceil(totalMovies / moviesPerPage);
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
    else if (currentPage < 1) currentPage = 1;
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages > 0 ? totalPages : 1;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages || totalMovies === 0;
    document.getElementById('jumpPage').max = totalPages > 0 ? totalPages : 1;
    document.getElementById('pagination').style.display = totalMovies > 0 ? 'flex' : 'none';

    // 控制操作按钮显隐
    document.getElementById('exportCsvBtn').style.display = totalMovies > 0 ? 'inline-flex' : 'none';
    document.querySelector('button[onclick="fetchAllMissingDetails()"]').style.display = totalMovies > 0 ? 'inline-flex' : 'none';

    // 3. 处理空列表
    if (totalMovies === 0) {
        container.innerHTML = '<p class="empty-message">你的收藏馆还是空的，快去添加或导入电影吧！</p>';
        document.getElementById('selectAll').checked = false;
        document.getElementById('deleteSelectedBtn').style.display = 'none';
        return;
    }

    // 4. 获取当前页数据并渲染
    const startIndex = (currentPage - 1) * moviesPerPage;
    const endIndex = Math.min(startIndex + moviesPerPage, totalMovies);
    const currentPageMovies = movies.slice(startIndex, endIndex);

    currentPageMovies.forEach((movie, index) => {
        const movieEl = document.createElement('div');
        movieEl.className = 'movie-item';
        movieEl.style.animationDelay = `${0.05 + index * 0.03}s`;

        const rating = typeof movie.rating === 'number' ? movie.rating.toFixed(1) : null;
        const addedDate = movie.createdAt ? new Date(movie.createdAt).toLocaleDateString('zh-CN', { year: '2-digit', month: '2-digit', day: '2-digit' }) : '?';
        const coverUrl = movie.coverUrl || DEFAULT_POSTER_URL;

        // 辅助函数创建 Meta HTML
        const createMetaItem = (iconPath, title, value) => value ? `<div class="meta-item" title="${title}: ${value}"><svg viewBox="0 0 24 24"><path d="${iconPath}"/></svg><span>${value}</span></div>` : '';

        // 构建 Meta HTML 字符串
        const metaHTML = `
            ${rating ? `<div class="movie-rating-display" title="个人评分 ${rating}"><svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg><span>${rating}</span></div>` : '<div class="movie-rating-display placeholder">未评分</div>'}
            ${createMetaItem("M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z", "上映年份", movie.year)}
            ${createMetaItem("M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z", "导演", movie.director)}
            ${createMetaItem("M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z", "国家/地区", movie.country)}
            ${createMetaItem("M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z", "观影日期", movie.ratingDate)}
        `;

        // 构建按钮 HTML
        const linkBtn = movie.link ? `<a href="${movie.link}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-small" title="查看链接"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg> 链接</a>` : '';
        const editBtn = `<button class="btn btn-outline btn-small" onclick="editMovie('${movie.id}')" title="编辑"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg> 编辑</button>`;
        const deleteBtn = `<button class="btn btn-outline btn-small" onclick="deleteMovie('${movie.id}')" title="删除"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg> 删除</button>`;

        // 填充卡片内容
        movieEl.innerHTML = `
            <div class="checkbox-container"><input type="checkbox" class="movie-checkbox" data-id="${movie.id}" title="选择"></div>
            <div class="movie-item-poster"><img src="${coverUrl}" alt="${movie.title} 海报" loading="lazy" onerror="this.onerror=null; this.src='${DEFAULT_POSTER_URL}';"></div>
            <div class="movie-item-content">
                <h3 class="movie-title" title="${movie.title}">${movie.title}</h3>
                <div class="movie-details-grid">${metaHTML}</div>
                ${movie.review ? `<p class="movie-review" title="短评">${movie.review}</p>` : ''}
                <div class="movie-actions">
                     <small class="movie-date" title="入馆日期">添加:${addedDate}</small>
                     <div class="action-buttons"> ${linkBtn} ${editBtn} ${deleteBtn} </div>
                </div>
            </div>`;
        container.appendChild(movieEl);
    });
    checkSelectedMovies(); // 更新全选等按钮状态
}


/**
 * 删除指定 ID 的电影。
 */
function deleteMovie(id) {
    if (!confirm('确定要删除这部电影吗？')) return;
    let movies = JSON.parse(localStorage.getItem('movies') || '[]');
    const initialLength = movies.length;
    movies = movies.filter(movie => String(movie.id) !== String(id)); // 使用字符串比较 ID
    if (movies.length < initialLength) {
        localStorage.setItem('movies', JSON.stringify(movies));
        // 检查删除后当前页是否还有效
        const totalPages = Math.ceil(movies.length / moviesPerPage);
        if (currentPage > totalPages) {
            currentPage = totalPages > 0 ? totalPages : 1; // 调整到最后一页或第一页
        }
        renderMovies(); // 重新渲染
        alert('电影已删除。');
    } else {
        alert('未找到要删除的电影。');
    }
}

/**
 * 删除选中的电影，支持全选删除所有。
 */
function deleteSelectedMovies() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const selectAllChecked = selectAllCheckbox.checked;
    const selectedCheckboxes = document.querySelectorAll('.movie-checkbox:checked');
    let movies = JSON.parse(localStorage.getItem('movies') || '[]');
    const totalMovies = movies.length;

    // 情况1：全选删除所有
    if (selectAllChecked && totalMovies > 0) {
        if (!confirm(`“全选”已启用。\n确定要删除全部 ${totalMovies} 部电影吗？此操作不可撤销！`)) return;
        localStorage.setItem('movies', JSON.stringify([])); // 清空
        currentPage = 1; // 重置页码
        alert(`已成功删除全部 ${totalMovies} 部电影！`);
    }
    // 情况2：删除当前页面选中的
    else if (selectedCheckboxes.length > 0) {
        const selectedIds = Array.from(selectedCheckboxes).map(cb => String(cb.dataset.id));
        const deleteCount = selectedIds.length;
        if (!confirm(`确定要删除选中的 ${deleteCount} 部电影吗？`)) return;
        movies = movies.filter(movie => !selectedIds.includes(String(movie.id))); // 过滤
        localStorage.setItem('movies', JSON.stringify(movies));
        // 检查页码有效性
        const totalPages = Math.ceil(movies.length / moviesPerPage);
        if (currentPage > totalPages) {
            currentPage = totalPages > 0 ? totalPages : 1;
        }
        alert(`成功删除 ${deleteCount} 部电影！`);
    }
    // 情况3：未选择
    else {
        alert('请先选择要删除的电影，或勾选“全选”以删除所有电影。');
        return;
    }

    // 操作完成后重置 UI
    selectAllCheckbox.checked = false;
    renderMovies();
}

/**
 * 打开编辑模态框并填充数据。
 */
function editMovie(id) {
    const movies = JSON.parse(localStorage.getItem('movies'));
    const movie = movies.find(m => String(m.id) === String(id));
    if (!movie) { alert('未找到电影信息。'); return; }
    // 填充表单
    document.getElementById('editMovieId').value = movie.id;
    document.getElementById('editTitle').value = movie.title || '';
    document.getElementById('editDirector').value = movie.director || '';
    document.getElementById('editYear').value = movie.year || '';
    document.getElementById('editRating').value = movie.rating || '';
    document.getElementById('editRatingDate').value = movie.ratingDate || ''; // 填充现有日期
    document.getElementById('editCountry').value = movie.country || '';
    document.getElementById('editLink').value = movie.link || '';
    document.getElementById('editCoverUrl').value = movie.coverUrl || '';
    document.getElementById('editReview').value = movie.review || '';
    // 显示模态框
    document.getElementById('editMovieModal').classList.add('active');
    document.body.style.overflow = 'hidden'; // 禁止背景滚动
}

/**
 * 关闭编辑模态框。
 */
function closeEditModal() {
    document.getElementById('editMovieModal').classList.remove('active');
    document.body.style.overflow = ''; // 恢复背景滚动
}

/**
 * 保存编辑模态框中的修改。
 * 注意：观影日期只有在输入了有效新日期时才更新，否则保留原值。
 */
function saveMovieEdit() {
    const movieId = document.getElementById('editMovieId').value;
    if (!movieId) return; // 无 ID 无法保存
    const movies = JSON.parse(localStorage.getItem('movies'));
    const movieIndex = movies.findIndex(m => String(m.id) === String(movieId));
    if (movieIndex === -1) { alert('更新失败，未找到对应的电影。'); closeEditModal(); return; }

    const updatedTitle = document.getElementById('editTitle').value.trim();
    const newRatingDateInput = document.getElementById('editRatingDate').value; // 获取编辑框中的日期值
    let ratingDateToSave = movies[movieIndex].ratingDate; // 默认保留原日期

    // 校验标题
    if (!updatedTitle) { alert('电影名称不能为空！'); return; }

    // 校验并决定是否更新打分日期
    if (newRatingDateInput) { // 仅当用户输入了内容时才处理
        if (isNaN(new Date(newRatingDateInput).getTime())) {
            alert('输入的观影日期格式无效！请使用 YYYY-MM-DD 格式，或留空以保留原日期。');
            return; // 格式无效，不保存
        }
        // 输入了内容且格式有效，则采用新日期
        ratingDateToSave = newRatingDateInput;
    }
    // 如果 newRatingDateInput 为空，则 ratingDateToSave 保持为原值

    // 更新电影对象
    movies[movieIndex] = {
        ...movies[movieIndex], // 保留 id, createdAt 等固有属性
        title: updatedTitle,
        director: document.getElementById('editDirector').value.trim(),
        year: parseInt(document.getElementById('editYear').value) || null,
        rating: parseFloat(document.getElementById('editRating').value) || null,
        ratingDate: ratingDateToSave, // 使用最终确定的日期值
        country: document.getElementById('editCountry').value.trim(),
        link: document.getElementById('editLink').value.trim(),
        coverUrl: document.getElementById('editCoverUrl').value.trim(),
        review: document.getElementById('editReview').value.trim(),
        updatedAt: new Date().toISOString() // 记录更新时间
    };

    // 保存回 localStorage
    localStorage.setItem('movies', JSON.stringify(movies));
    closeEditModal(); // 关闭模态框
    renderMovies(); // 重新渲染列表
    alert('更新成功！');
}


// --- UI & Pagination ---
/**
 * 对新渲染的电影卡片应用淡入动画。
 */
function animateCards() {
    const cards = document.querySelectorAll('.movie-item');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(10px)';
        requestAnimationFrame(() => { // 使用 rAF 优化动画性能
            card.style.transition = `all 0.3s ease-out ${index * 0.03}s`;
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });
    });
}

/**
 * 跳转到下一页。
 */
function goToNextPage() {
    const totalPages = Math.ceil(JSON.parse(localStorage.getItem('movies') || '[]').length / moviesPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderMovies();
        // 滚动到列表顶部附近，提供更好的上下文
        window.scrollTo({ top: document.querySelector('#my-collection-section')?.offsetTop - 20 || 0, behavior: 'smooth' });
    }
}
/**
 * 跳转到上一页。
 */
function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderMovies();
        window.scrollTo({ top: document.querySelector('#my-collection-section')?.offsetTop - 20 || 0, behavior: 'smooth' });
    }
}
/**
 * 跳转到指定页码。
 */
function jumpToPage() {
    const jumpInput = document.getElementById('jumpPage');
    const pageNum = parseInt(jumpInput.value);
    const totalPages = Math.ceil(JSON.parse(localStorage.getItem('movies') || '[]').length / moviesPerPage);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        currentPage = pageNum;
        renderMovies();
        jumpInput.value = ''; // 清空输入
        window.scrollTo({ top: document.querySelector('#my-collection-section')?.offsetTop - 20 || 0, behavior: 'smooth' });
    } else {
        alert(`请输入 1 到 ${totalPages} 之间的有效页码！`);
        jumpInput.value = '';
    }
}

/**
 * 处理全选复选框的变更事件。
 */
function handleSelectAll() {
    const isChecked = document.getElementById('selectAll').checked;
    document.querySelectorAll('.movie-checkbox').forEach(checkbox => checkbox.checked = isChecked);
    checkSelectedMovies(); // 更新删除按钮状态
}
/**
 * 检查是否有电影被选中，并更新“删除选中”按钮和“全选”复选框的状态。
 */
function checkSelectedMovies() {
    const selectedCount = document.querySelectorAll('.movie-checkbox:checked').length;
    const totalCount = document.querySelectorAll('.movie-checkbox').length;
    document.getElementById('deleteSelectedBtn').style.display = selectedCount > 0 ? 'inline-flex' : 'none';
    document.getElementById('selectAll').checked = totalCount > 0 && selectedCount === totalCount;
}
/**
 * 打开豆瓣搜索页面搜索当前输入的电影标题。
 */
function searchDouban() {
    const titleInput = document.getElementById('title'); // 获取添加表单的标题输入框
    const title = titleInput.value.trim();
    if (!title) {
        alert('请输入电影名称后再进行豆瓣搜索。');
        titleInput.focus(); // 聚焦输入框提示用户
        return;
    }
    // 构建豆瓣搜索 URL 并在新标签页打开
    const searchUrl = `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(title)}`;
    window.open(searchUrl, '_blank');
}

// --- Initialization ---
/**
 * 页面加载完成后的初始化函数。
 */
function init() {
    initStorage(); // 确保 localStorage 初始化
    renderMovies(); // 首次渲染电影列表
    animateCards(); // 应用入场动画

    // --- 绑定事件监听器 ---
    document.getElementById('nextPage').addEventListener('click', goToNextPage);
    document.getElementById('prevPage').addEventListener('click', goToPrevPage);
    document.getElementById('selectAll').addEventListener('change', handleSelectAll);
    document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedMovies);
    // 使用事件委托监听电影列表中的复选框变化
    document.getElementById('movieList').addEventListener('change', (e) => {
        if (e.target.matches('.movie-checkbox')) {
            checkSelectedMovies();
        }
    });
    // ESC 键关闭编辑模态框
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('editMovieModal').classList.contains('active')) {
            closeEditModal();
        }
    });
    // 点击模态框背景关闭
    document.getElementById('editMovieModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) { // 确保点击的是背景遮罩层本身
            closeEditModal();
        }
    });
    // 文件选择变化时更新文件名显示
    document.getElementById('fileInput').addEventListener('change', (e) => {
        document.getElementById('fileName').textContent = e.target.files[0]?.name || '未选择文件';
    });
    // 豆瓣搜索按钮的 onclick 在 HTML 中直接绑定

    // --- 初始化 UI 状态 ---
    // 设置页脚日期
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    // 检查并显示 API Key 保存状态
    if (getTmdbApiKey()) {
        document.getElementById('tmdbApiKey').placeholder = "API Key 已保存";
        console.log("TMDb API Key loaded.");
    }
    // 初始检查选中状态（例如，刷新页面后）
    checkSelectedMovies();
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);