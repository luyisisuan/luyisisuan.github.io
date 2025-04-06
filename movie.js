// 初始化存储
function initStorage() {
    if (!localStorage.getItem('movies')) {
        localStorage.setItem('movies', JSON.stringify([]));
    }
}

// CSV处理
function parseCSV(csvText) {
    const rows = csvText.split('\n').filter(row => row.trim() !== '');
    const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    return rows.slice(1).map(row => {
        const columns = row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
        const movie = {};
        headers.forEach((header, index) => {
            let value = columns[index] ? columns[index].trim().replace(/^"(.*)"$/, '$1') : '';
            switch(header) {
                case '电影/电视剧/番组':
                    movie.title = value;
                    break;
                case '个人评分':
                    movie.rating = parseFloat(value) || null;
                    break;
                case '打分日期':
                    movie.ratingDate = value;
                    break;
                case '我的短评':
                    movie.review = value;
                    break;
                case '上映日期':
                    movie.year = parseInt(value.split('/')[0]) || null;
                    break;
                case '制片国家':
                    movie.country = value;
                    break;
                case '条目链接':
                    movie.link = value;
                    break;
            }
        });
        return {
            id: Date.now() + Math.random(),
            title: movie.title,
            director: '',
            year: movie.year,
            rating: movie.rating,
            ratingDate: movie.ratingDate || '',
            review: movie.review,
            country: movie.country || '',
            link: movie.link || '',
            coverUrl: '',
            createdAt: new Date().toISOString()
        };
    });
}

// 导入CSV
async function importCSV() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files.length) return alert('请选择CSV文件');

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const csvData = parseCSV(e.target.result);
            const existingMovies = JSON.parse(localStorage.getItem('movies'));
            
            // 去重处理
            const newMovies = csvData.filter(newMovie => 
                !existingMovies.some(existing => 
                    existing.title === newMovie.title && 
                    existing.year === newMovie.year
                )
            );

            localStorage.setItem('movies', JSON.stringify([...existingMovies, ...newMovies]));
            renderMovies();
            animateCards();
            alert(`成功导入 ${newMovies.length} 部电影，跳过 ${csvData.length - newMovies.length} 部重复`);
        } catch (error) {
            alert('CSV文件解析失败，请检查格式');
        }
    };
    reader.readAsText(fileInput.files[0], 'UTF-8');
}

// 添加电影
function addMovie(e) {
    e.preventDefault();
    
    const movie = {
        id: Date.now(),
        title: document.getElementById('title').value,
        director: document.getElementById('director').value,
        year: parseInt(document.getElementById('year').value) || null,
        rating: parseFloat(document.getElementById('rating').value) || null,
        ratingDate: document.getElementById('ratingDate').value,
        review: document.getElementById('review').value,
        country: document.getElementById('country').value,
        link: document.getElementById('link').value,
        coverUrl: document.getElementById('coverUrl').value,
        createdAt: new Date().toISOString()
    };

    const movies = JSON.parse(localStorage.getItem('movies'));
    movies.push(movie);
    localStorage.setItem('movies', JSON.stringify(movies));
    
    renderMovies();
    animateCards();
    e.target.reset();
    return false;
}

// 分页变量
let currentPage = 1;
const moviesPerPage = 6; // 每页显示的电影数量

// 渲染电影列表
function renderMovies() {
    const movies = JSON.parse(localStorage.getItem('movies'));
    const container = document.getElementById('movieList');
    const countSpan = document.getElementById('movieCount');
    const totalPages = Math.ceil(movies.length / moviesPerPage);
    const paginationElement = document.getElementById('pagination');
    
    // 更新电影总数
    countSpan.textContent = movies.length;
    container.innerHTML = '';
    
    // 更新分页信息
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages || totalPages === 0;
    
    // 显示或隐藏分页控件
    paginationElement.style.display = totalPages > 1 ? 'flex' : 'none';

    if (movies.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--dark);opacity:0.6;">暂无电影收藏，请添加或导入</p>';
        return;
    }
    
    // 计算当前页的电影
    const startIndex = (currentPage - 1) * moviesPerPage;
    const endIndex = Math.min(startIndex + moviesPerPage, movies.length);
    const currentPageMovies = movies.slice(startIndex, endIndex);

    currentPageMovies.forEach((movie, index) => {
        const movieEl = document.createElement('div');
        movieEl.className = 'movie-item';
        movieEl.style.animationDelay = `${0.6 + index * 0.1}s`;
        
        const ratingDisplay = movie.rating ? `
            <span class="movie-rating">
                <svg viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
                ${movie.rating}
            </span>
        ` : '';
        
        const yearDisplay = movie.year ? `
            <span>
                <svg viewBox="0 0 24 24">
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
                </svg>
                ${movie.year}
            </span>
        ` : '';
        
        const directorDisplay = movie.director ? `
            <span>
                <svg viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                ${movie.director}
            </span>
        ` : '';
        
        const countryDisplay = movie.country ? `
            <span>
                <svg viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                ${movie.country}
            </span>
        ` : '';
        
        const ratingDateDisplay = movie.ratingDate ? `
            <span>
                <svg viewBox="0 0 24 24">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                    <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                </svg>
                ${movie.ratingDate}
            </span>
        ` : '';
        
        const linkButton = movie.link ? `
            <a href="${movie.link}" target="_blank" class="btn btn-outline" style="padding:0.3rem 0.8rem;font-size:0.8rem;">
                <svg viewBox="0 0 24 24" width="14" height="14">
                    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                </svg>
                查看详情
            </a>
        ` : '';
        
        movieEl.innerHTML = `
            <div class="checkbox-container">
                <input type="checkbox" class="checkbox-input movie-checkbox" data-id="${movie.id}">
            </div>
            <img class="movie-poster" src="${movie.coverUrl || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQzNjFlZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xOSAyMUg1YTIgMiAwIDAgMS0yLTJWNWEyIDIgMCAwIDEgMi0yaDE0YTIgMiAwIDAgMSAyIDJ2MTRhMiAyIDAgMCAxLTIgMnoiPjwvcGF0aD48cGF0aCBkPSJNMTIgMTdoLTFjLTEuMSAwLTIuOS0uNC0zLjktMS4xTDEwIDEzLjVjLjUtLjcgMS4xLTEuNCAxLjYtMi4xLjUtLjcgMS0xLjQgMS0yLjFWMTAiPjwvcGF0aD48cGF0aCBkPSJNMTcgMTdoLTFjLTEuMSAwLTIuOS0uNC0zLjktMS4xTDE1IDEzLjVjLjUtLjcgMS4xLTEuNCAxLjYtMi4xLjUtLjcgMS0xLjQgMS0yLjFWMTAiPjwvcGF0aD48L3N2Zz4='}" alt="${movie.title}海报">
            <div class="movie-content">
                <h3 class="movie-title">${movie.title}</h3>
                <div class="movie-meta">
                    ${directorDisplay}
                    ${yearDisplay}
                    ${ratingDisplay}
                    ${ratingDateDisplay}
                    ${countryDisplay}
                </div>
                ${movie.review ? `<p class="movie-review">${movie.review}</p>` : ''}
                <div class="movie-actions">
                    <small class="movie-date">添加于 ${new Date(movie.createdAt).toLocaleDateString()}</small>
                    <div>
                        ${linkButton}
                        <button class="btn btn-outline" onclick="editMovie(${movie.id})" style="padding:0.3rem 0.8rem;font-size:0.8rem;margin-right:0.5rem;">
                            <svg viewBox="0 0 24 24" width="14" height="14">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                            编辑
                        </button>
                        <button class="btn btn-outline" onclick="deleteMovie(${movie.id})" style="padding:0.3rem 0.8rem;font-size:0.8rem;">
                            <svg viewBox="0 0 24 24" width="14" height="14">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                            删除
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(movieEl);
    });
}

// 删除电影
function deleteMovie(id) {
    if (!confirm('确定要删除这部电影吗？')) return;
    
    let movies = JSON.parse(localStorage.getItem('movies'));
    movies = movies.filter(movie => movie.id !== id);
    localStorage.setItem('movies', JSON.stringify(movies));
    renderMovies();
    animateCards();
}

// 删除选中的电影
function deleteSelectedMovies() {
    const selectAllChecked = document.getElementById('selectAll').checked;
    const selectedCheckboxes = document.querySelectorAll('.movie-checkbox:checked');
    
    // 如果没有选中任何电影且全选未勾选，则直接返回
    if (selectedCheckboxes.length === 0 && !selectAllChecked) return;
    
    let movies = JSON.parse(localStorage.getItem('movies'));
    let deleteCount = selectedCheckboxes.length;
    
    // 如果全选按钮被勾选，则删除所有电影
    if (selectAllChecked) {
        deleteCount = movies.length;
        if (!confirm(`确定要删除全部 ${deleteCount} 部电影吗？`)) return;
        
        // 清空所有电影
        localStorage.setItem('movies', JSON.stringify([]));
    } else {
        // 否则只删除选中的电影
        if (!confirm(`确定要删除选中的 ${deleteCount} 部电影吗？`)) return;
        
        const selectedIds = Array.from(selectedCheckboxes).map(checkbox => parseFloat(checkbox.dataset.id));
        movies = movies.filter(movie => !selectedIds.includes(movie.id));
        localStorage.setItem('movies', JSON.stringify(movies));
    }
    
    // 重置全选按钮
    document.getElementById('selectAll').checked = false;
    document.getElementById('deleteSelectedBtn').style.display = 'none';
    
    renderMovies();
    animateCards();
}

// 卡片动画
function animateCards() {
    const cards = document.querySelectorAll('.card, .movie-item');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.animation = `fadeIn 0.6s forwards ${0.2 + index * 0.1}s`;
    });
}

// 分页导航
function goToNextPage() {
    const totalPages = Math.ceil(JSON.parse(localStorage.getItem('movies')).length / moviesPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderMovies();
        animateCards();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderMovies();
        animateCards();
    }
}

function jumpToPage() {
    const jumpInput = document.getElementById('jumpPage');
    const pageNum = parseInt(jumpInput.value);
    const totalPages = Math.ceil(JSON.parse(localStorage.getItem('movies')).length / moviesPerPage);
    
    if (pageNum && pageNum >= 1 && pageNum <= totalPages) {
        currentPage = pageNum;
        renderMovies();
        animateCards();
        jumpInput.value = '';
    } else {
        alert('请输入有效的页码！');
    }
}

// 全选功能
function handleSelectAll() {
    const isChecked = document.getElementById('selectAll').checked;
    // 选中当前页面上的所有复选框
    document.querySelectorAll('.movie-checkbox').forEach(checkbox => {
        checkbox.checked = isChecked;
    });
    
    // 显示或隐藏删除按钮
    // 即使当前页面没有电影，只要全选按钮被勾选，也应该显示删除按钮
    const movies = JSON.parse(localStorage.getItem('movies'));
    if (isChecked && movies.length > 0) {
        document.getElementById('deleteSelectedBtn').style.display = 'inline-flex';
    } else {
        document.getElementById('deleteSelectedBtn').style.display = 
            document.querySelectorAll('.movie-checkbox:checked').length > 0 ? 'inline-flex' : 'none';
    }
}

// 检查是否有选中的电影
function checkSelectedMovies() {
    const selectedCheckboxes = document.querySelectorAll('.movie-checkbox:checked');
    document.getElementById('deleteSelectedBtn').style.display = selectedCheckboxes.length > 0 ? 'inline-flex' : 'none';
    
    // 更新全选按钮状态
    const allCheckboxes = document.querySelectorAll('.movie-checkbox');
    document.getElementById('selectAll').checked = selectedCheckboxes.length > 0 && selectedCheckboxes.length === allCheckboxes.length;
}

// 编辑电影功能
function editMovie(id) {
    const movies = JSON.parse(localStorage.getItem('movies'));
    const movie = movies.find(m => m.id === id);
    
    if (!movie) return;
    
    // 填充表单数据
    document.getElementById('editMovieId').value = movie.id;
    document.getElementById('editTitle').value = movie.title || '';
    document.getElementById('editDirector').value = movie.director || '';
    document.getElementById('editYear').value = movie.year || '';
    document.getElementById('editRating').value = movie.rating || '';
    document.getElementById('editRatingDate').value = movie.ratingDate || '';
    document.getElementById('editCountry').value = movie.country || '';
    document.getElementById('editLink').value = movie.link || '';
    document.getElementById('editCoverUrl').value = movie.coverUrl || '';
    document.getElementById('editReview').value = movie.review || '';
    
    // 打开模态框
    document.getElementById('editMovieModal').classList.add('active');
    document.body.style.overflow = 'hidden'; // 防止背景滚动
}

// 关闭编辑模态框
function closeEditModal() {
    document.getElementById('editMovieModal').classList.remove('active');
    document.body.style.overflow = '';
}

// 保存电影编辑
function saveMovieEdit() {
    const movieId = document.getElementById('editMovieId').value;
    const movies = JSON.parse(localStorage.getItem('movies'));
    const movieIndex = movies.findIndex(m => m.id == movieId);
    
    if (movieIndex === -1) return;
    
    // 更新电影数据
    movies[movieIndex] = {
        ...movies[movieIndex],
        title: document.getElementById('editTitle').value,
        director: document.getElementById('editDirector').value,
        year: parseInt(document.getElementById('editYear').value) || null,
        rating: parseFloat(document.getElementById('editRating').value) || null,
        ratingDate: document.getElementById('editRatingDate').value,
        country: document.getElementById('editCountry').value,
        link: document.getElementById('editLink').value,
        coverUrl: document.getElementById('editCoverUrl').value,
        review: document.getElementById('editReview').value,
        updatedAt: new Date().toISOString()
    };
    
    // 保存到本地存储
    localStorage.setItem('movies', JSON.stringify(movies));
    
    // 关闭模态框并刷新电影列表
    closeEditModal();
    renderMovies();
    animateCards();
    
    // 显示成功消息
    alert('电影信息已成功更新！');
}

// 初始化函数
function init() {
    initStorage();
    renderMovies();
    animateCards();
    
    // 添加事件监听器
    document.getElementById('nextPage').addEventListener('click', goToNextPage);
    document.getElementById('prevPage').addEventListener('click', goToPrevPage);
    document.getElementById('selectAll').addEventListener('change', handleSelectAll);
    document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedMovies);
    
    // 为电影复选框添加事件委托
    document.getElementById('movieList').addEventListener('change', function(e) {
        if (e.target.classList.contains('movie-checkbox')) {
            checkSelectedMovies();
        }
    });
    
    // 为ESC键添加关闭模态框事件
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeEditModal();
        }
    });
    
    // 点击模态框背景关闭模态框
    document.getElementById('editMovieModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeEditModal();
        }
    });
    
    // 设置当前日期
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    
    // 文件输入事件
    document.getElementById('fileInput').addEventListener('change', function(e) {
        document.getElementById('fileName').textContent = e.target.files[0]?.name || '未选择文件';
    });
    
    // 延迟加载动画
    setTimeout(() => {
        document.querySelectorAll('.card, .movie-item').forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });
    }, 100);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);