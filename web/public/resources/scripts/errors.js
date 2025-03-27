module.exports = {  
    showToast : function (message, type) {
    fetch('../public/pages/example.html')
        .then(response => response.text())
        .then(data => {
            
          const parser = new DOMParser();
          const htmlDocument = parser.parseFromString(data, 'text/html');
          // Use the HTML document as needed...
       
    var toast = document.createElement('div');
    toast.classList.add('toast');
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    var toastHeader = document.createElement('div');
    toastHeader.classList.add('toast-header');
    toastHeader.classList.add('bg-' + type);
    toastHeader.classList.add('text-white');

    var toastTitle = document.createElement('strong');
    toastTitle.classList.add('mr-auto');
    toastTitle.textContent = 'Message';

    var closeButton = document.createElement('button');
    closeButton.setAttribute('type', 'button');
    closeButton.classList.add('ml-2');
    closeButton.classList.add('mb-1');
    closeButton.classList.add('close');
    closeButton.setAttribute('data-dismiss', 'toast');
    closeButton.setAttribute('aria-label', 'Close');

    var closeIcon = document.createElement('span');
    closeIcon.setAttribute('aria-hidden', 'true');
    closeIcon.innerHTML = '&times;';

    var toastBody = document.createElement('div');
    toastBody.classList.add('toast-body');
    toastBody.textContent = message;

    closeButton.appendChild(closeIcon);
    toastHeader.appendChild(toastTitle);
    toastHeader.appendChild(closeButton);
    toast.appendChild(toastHeader);
    toast.appendChild(toastBody);

    document.body.appendChild(toast);

    var bsToast = new bootstrap.Toast(toast);
    bsToast.show();
})
.catch(error => console.error(error));
}

}