import Toastify from 'toastify-js';
import Swal from 'sweetalert2';

export const showToast = (message, type = 'info') => {
    const backgroundColor = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196F3'
    }[type];

    Toastify({
        text: message,
        duration: 3000,
        gravity: 'bottom',
        position: 'right',
        backgroundColor,
        stopOnFocus: true
    }).showToast();
};

export const showConfirmDialog = async (title, text) => {
    const result = await Swal.fire({
        title,
        text,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
        reverseButtons: true
    });
    return result.isConfirmed;
};

export const showEditDialog = async (currentText) => {
    const result = await Swal.fire({
        title: 'Edit Post',
        input: 'textarea',
        inputValue: currentText,
        inputPlaceholder: 'Type your updated post here...',
        showCancelButton: true,
        confirmButtonText: 'Update',
        cancelButtonText: 'Cancel',
        inputValidator: (value) => {
            if (!value.trim()) {
                return 'Post content cannot be empty!';
            }
        }
    });
    return result.value;
};