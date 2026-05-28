/* ==============================
   TodoFlow — Full-Featured Task Manager
   ============================== */

// ==============================
// State
// ==============================
let currentFilter = 'all';
let searchQuery = '';
let editingIndex = -1;

// ==============================
// Migrate old localStorage data
// ==============================
(function migrateOldData() {
    const oldData = localStorage.getItem('itemsJson');
    if (oldData) {
        try {
            const oldTasks = JSON.parse(oldData);
            if (Array.isArray(oldTasks) && oldTasks.length > 0) {
                const newTasks = oldTasks.map((item, idx) => ({
                    id: Date.now().toString(36) + '-' + idx,
                    title: item[0] || 'Untitled',
                    description: item[1] || '',
                    completed: false,
                    createdAt: new Date().toISOString()
                }));
                localStorage.setItem('todoflow_tasks', JSON.stringify(newTasks));
                localStorage.removeItem('itemsJson');
            }
        } catch (e) {
            // Ignore migration errors
        }
    }
})();

// ==============================
// DOM References
// ==============================
const titleInput = document.getElementById('title');
const descInput = document.getElementById('description');
const addBtn = document.getElementById('add');
const tasksContainer = document.getElementById('tasksContainer');
const emptyState = document.getElementById('emptyState');
const noResultsState = document.getElementById('noResultsState');
const taskCount = document.getElementById('taskCount');
const searchInput = document.getElementById('searchInput');

// ==============================
// Utility: Toast Notifications
// ==============================
function showToast(message, type = 'info') {
    // Remove existing toast container or create one
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Auto-remove after 2.5s
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ==============================
// Core: Get Tasks from Storage
// ==============================
function getTasks() {
    const data = localStorage.getItem('todoflow_tasks');
    if (!data) return [];
    try {
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// ==============================
// Core: Save Tasks to Storage
// ==============================
function saveTasks(tasks) {
    localStorage.setItem('todoflow_tasks', JSON.stringify(tasks));
}

// ==============================
// Core: Render Tasks
// ==============================
function renderTasks() {
    let tasks = getTasks();

    // Apply search filter
    if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        tasks = tasks.filter(t =>
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q)
        );
    }

    // Apply status filter
    if (currentFilter === 'active') {
        tasks = tasks.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        tasks = tasks.filter(t => t.completed);
    }

    // Update task count
    const allTasks = getTasks();
    taskCount.textContent = allTasks.length;

    // Handle empty states
    if (allTasks.length === 0) {
        tasksContainer.innerHTML = '';
        emptyState.style.display = 'block';
        noResultsState.style.display = 'none';
        return;
    }

    if (tasks.length === 0 && searchQuery.trim()) {
        tasksContainer.innerHTML = '';
        emptyState.style.display = 'none';
        noResultsState.style.display = 'block';
        return;
    }

    if (tasks.length === 0) {
        tasksContainer.innerHTML = '';
        emptyState.style.display = 'block';
        noResultsState.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    noResultsState.style.display = 'none';

    // Build task HTML
    let html = '';
    tasks.forEach((task, index) => {
        const realIndex = getTasks().findIndex(t => t.id === task.id);
        const completedClass = task.completed ? 'completed' : '';
        const titleClass = task.completed ? 'completed-text' : '';
        const descClass = task.completed ? 'completed-text' : '';

        html += `
            <div class="task-item" data-index="${realIndex}">
                <div class="task-check">
                    <div class="checkbox ${completedClass}" onclick="toggleComplete(${realIndex})">
                        ${task.completed ? '<i class="fas fa-check"></i>' : ''}
                    </div>
                </div>
                <div class="task-content">
                    <div class="task-title ${titleClass}">${escapeHtml(task.title)}</div>
                    ${task.description ? `<div class="task-desc ${descClass}">${escapeHtml(task.description)}</div>` : ''}
                </div>
                <div class="task-actions">
                    <button class="btn-icon complete-btn" onclick="toggleComplete(${realIndex})" title="${task.completed ? 'Mark as active' : 'Mark as complete'}">
                        <i class="fas ${task.completed ? 'fa-rotate-left' : 'fa-check'}"></i>
                    </button>
                    <button class="btn-icon edit-btn" onclick="editTask(${realIndex})" title="Edit task">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn-icon delete-btn" onclick="deleteTask(${realIndex})" title="Delete task">
                        <i class="fas fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;
    });

    tasksContainer.innerHTML = html;
}

// ==============================
// Utility: Escape HTML
// ==============================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==============================
// Action: Add / Update Task
// ==============================
function handleAddTask() {
    const title = titleInput.value.trim();
    const description = descInput.value.trim();

    if (!title) {
        showToast('Please enter a task title!', 'error');
        titleInput.focus();
        return;
    }

    // Show mini character warning but still allow
    if (title.length < 2) {
        showToast('Title is too short!', 'error');
        return;
    }

    let tasks = getTasks();

    if (editingIndex >= 0) {
        // Update existing task
        tasks[editingIndex].title = title;
        tasks[editingIndex].description = description;
        saveTasks(tasks);
        showToast('Task updated successfully!', 'success');

        // Reset editing state
        editingIndex = -1;
        addBtn.innerHTML = '<i class="fas fa-plus"></i> Add Task';
        addBtn.classList.remove('btn-success');
        addBtn.classList.add('btn-primary');
    } else {
        // Add new task
        const newTask = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            title: title,
            description: description,
            completed: false,
            createdAt: new Date().toISOString()
        };
        tasks.push(newTask);
        saveTasks(tasks);
        showToast('Task added successfully!', 'success');
    }

    // Clear inputs
    titleInput.value = '';
    descInput.value = '';
    titleInput.focus();

    renderTasks();
}

// ==============================
// Action: Edit Task
// ==============================
function editTask(index) {
    const tasks = getTasks();
    if (index < 0 || index >= tasks.length) return;

    const task = tasks[index];
    titleInput.value = task.title;
    descInput.value = task.description;
    editingIndex = index;

    addBtn.innerHTML = '<i class="fas fa-pen"></i> Update Task';
    addBtn.classList.remove('btn-primary');
    addBtn.classList.add('btn-success');

    // Add success class via style override
    addBtn.style.background = 'linear-gradient(135deg, #00b894, #00cec9)';
    addBtn.style.boxShadow = '0 4px 15px rgba(0, 184, 148, 0.4)';

    titleInput.focus();
    showToast('Editing task — update and save!', 'info');

    // Scroll to top smoothly
    document.querySelector('.add-task-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ==============================
// Action: Toggle Complete
// ==============================
function toggleComplete(index) {
    const tasks = getTasks();
    if (index < 0 || index >= tasks.length) return;

    tasks[index].completed = !tasks[index].completed;
    saveTasks(tasks);

    const action = tasks[index].completed ? 'completed' : 'marked as active';
    showToast(`Task "${tasks[index].title}" ${action}!`, tasks[index].completed ? 'success' : 'info');

    renderTasks();
}

// ==============================
// Action: Delete Task
// ==============================
function deleteTask(index) {
    const tasks = getTasks();
    if (index < 0 || index >= tasks.length) return;

    const taskTitle = tasks[index].title;

    // If currently editing this task, reset editing state
    if (editingIndex === index) {
        resetEditingState();
    }

    tasks.splice(index, 1);
    saveTasks(tasks);

    showToast(`Task "${taskTitle}" deleted!`, 'error');

    // Adjust editing index if needed
    if (editingIndex > index) {
        editingIndex--;
    } else if (editingIndex === index) {
        resetEditingState();
    }

    renderTasks();
}

// ==============================
// Action: Clear All Tasks
// ==============================
function clearStorage() {
    const tasks = getTasks();
    if (tasks.length === 0) {
        showToast('No tasks to clear!', 'info');
        return;
    }

    if (confirm('⚠️ Are you sure you want to delete ALL tasks? This cannot be undone.')) {
        localStorage.removeItem('todoflow_tasks');
        resetEditingState();
        showToast('All tasks cleared!', 'error');
        renderTasks();
    }
}

// ==============================
// Action: Reset Editing State
// ==============================
function resetEditingState() {
    editingIndex = -1;
    titleInput.value = '';
    descInput.value = '';
    addBtn.innerHTML = '<i class="fas fa-plus"></i> Add Task';
    addBtn.classList.remove('btn-success');
    addBtn.classList.add('btn-primary');
    addBtn.style.background = '';
    addBtn.style.boxShadow = '';
}

// ==============================
// Filter: Set Current Filter
// ==============================
function setFilter(filter) {
    currentFilter = filter;

    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    renderTasks();
}

// ==============================
// Keyboard Shortcuts & Events
// ==============================
function setupEventListeners() {
    // Add task on Enter key (from title or description)
    titleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            descInput.focus();
        }
    });

    descInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAddTask();
        }
    });

    // Add button click
    addBtn.addEventListener('click', handleAddTask);

    // Search with debounce
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchQuery = searchInput.value;
            renderTasks();
        }, 250);
    });

    // Escape key to cancel editing
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && editingIndex >= 0) {
            resetEditingState();
            showToast('Editing cancelled', 'info');
        }
    });
}

// ==============================
// Init
// ==============================
function init() {
    setupEventListeners();

    // Add a welcome toast
    const tasks = getTasks();
    if (tasks.length === 0) {
        setTimeout(() => {
            showToast('👋 Welcome to TodoFlow! Add your first task.', 'info');
        }, 500);
    } else {
        setTimeout(() => {
            showToast(`📋 You have ${tasks.length} task${tasks.length > 1 ? 's' : ''}`, 'info');
        }, 500);
    }

    renderTasks();
}

// ==============================
// Start App
// ==============================
document.addEventListener('DOMContentLoaded', init);