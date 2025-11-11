
const modal = document.getElementById('confirmation-modal');
const titleEl = document.getElementById('modal-title');
const messageEl = document.getElementById('modal-message');
const confirmBtn = document.getElementById('modal-confirm-btn');
const cancelBtn = document.getElementById('modal-cancel-btn');

let resolvePromise;

function show({ title = 'Confirm', message = 'Are you sure?', confirmText = 'Confirm', cancelText = 'Cancel' }) {
    titleEl.textContent = title;
    messageEl.textContent = message;
    confirmBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;
    modal.classList.add('visible');
}

function hide() {
    modal.classList.remove('visible');
}

function handleConfirm() {
    if (resolvePromise) {
        resolvePromise(true);
    }
    hide();
}

function handleCancel() {
    if (resolvePromise) {
        resolvePromise(false);
    }
    hide();
}

confirmBtn.addEventListener('click', handleConfirm);
cancelBtn.addEventListener('click', handleCancel);
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        handleCancel();
    }
});


export const modalService = {
    confirm: (options) => {
        return new Promise((resolve) => {
            resolvePromise = resolve;
            show(options);
        });
    }
};
