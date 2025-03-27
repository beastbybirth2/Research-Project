function Login() {
    const email = $('#loginEmail').val();
    const password = $('#loginPassword').val();
    const body = {email, password}
    $.post(`/users/login`, body);
}
function SignUp() {
    //signupbutt
    fName = document.getElementById("signupFirstname").value;
    sName = document.getElementById("signupSecondname").value;
    email = document.getElementById("signupEmail").value;
    password = document.getElementById('signupPassword').value;
    password2 = document.getElementById('signupPassword').value;
    roomNumber = document.getElementById('signupRoom').value;
   const body = {
    fName, sName, email, pass, pass2, roomNumber
   }
    $.post(`/users/register`, body);
}
function deleteUser(userIdToDelete) {
    const filteredUsers = users.filter(user => user.id !== userIdToDelete);
    localStorage.setItem('indiusers', JSON.stringify(filteredUsers));
}