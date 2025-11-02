export default function validateFields({ name, email, phone }) {
  let errorMessage = "";
  if (!/^[a-zA-Z\s]+$/.test(name)) {
    errorMessage = "Name should contain only alphabets";
  }
  
  if (phone!="" && phone!=undefined && !/^\d{1,10}$/.test(phone)) {
    errorMessage = "Phone number must be 10 digits";
  }

  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    errorMessage = "Invalid email format. Please enter a valid email";
  }
  return errorMessage;
}
