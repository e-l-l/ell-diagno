import axios from "axios";

const BaseURL = "http://192.168.68.100:3000";

export const generateCase = async () => {
  try {
    const response = await axios.post(
      `${BaseURL}/cases/generate`,
    );
    console.log("Response", response.data);
    return response.data;
  } catch (error: any) {
    if (error.code === "ERR_NETWORK") {
      console.error(
        "Network Error: Cannot connect to server. Make sure backend is running on port 3000"
      );
    } else if (error.code === "ECONNREFUSED") {
      console.error("Connection Refused: Backend server is not running");
    } else {
      console.error("API Error:", error.response?.data || error.message);
    }
    throw error; // Re-throw to let caller handle it
  }
};
