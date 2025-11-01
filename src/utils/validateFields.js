export default function validateFields({ name, email, phone }) {
  let errorMessage = "";
  if (!/^[a-zA-Z\s]+$/.test(name)) {
    errorMessage = "Name should contain only alphabets";
  }

  if (!/^\d{1,10}$/.test(phone)) {
    errorMessage = "Number must be 1-10 digits only";
  }

  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    errorMessage = "Invalid email format";
  }
  return errorMessage;
}
