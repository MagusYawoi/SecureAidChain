import axios from "axios";

const API = axios.create({ baseURL: "/api" });

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const register = (data) => API.post("/auth/register", data);
export const login = (data) => API.post("/auth/login", data);
export const getMe = () => API.get("/auth/me");

// Disasters
export const getDisasters = (params) => API.get("/disasters", { params });
export const getDisaster = (id) => API.get(`/disasters/${id}`);
export const createDisaster = (data) => API.post("/disasters", data);
export const updateDisaster = (id, data) => API.patch(`/disasters/${id}`, data);

// Transactions
export const getTransactions = (params) => API.get("/transactions", { params });
export const recordTransaction = (data) => API.post("/transactions", data);

// Users
export const getUsers = (params) => API.get("/users", { params });
export const getBeneficiaries = () => API.get("/users/beneficiaries");
export const verifyUser = (id) => API.patch(`/users/${id}/verify`);
export const updateWallet = (id, walletAddress) => API.patch(`/users/${id}/wallet`, { walletAddress });

// QR Code
export const generateQR = (data) => API.post("/qrcode/generate", { data });

// IPFS
export const uploadToIPFS = (file) => {
  const form = new FormData();
  form.append("file", file);
  return API.post("/ipfs/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
};

// Blockchain
export const getDisbursements = () => API.get("/blockchain/disbursements");
export const getPendingRequests = () => API.get("/blockchain/requests");
export const confirmDeliveryAPI = (disbursementIndex, ipfsHash) =>
  API.post("/blockchain/confirm-delivery", { disbursementIndex, ipfsHash });
export const requestDisbursementAPI = (recipientAddress, amountEth, disasterId) =>
  API.post("/blockchain/request-disbursement", { recipientAddress, amountEth, disasterId });
export const approveDisbursementAPI = (requestId) =>
  API.post("/blockchain/approve-disbursement", { requestId });

// Disaster verification
export const verifyDisaster = (id, action, note) =>
  API.patch(`/disasters/${id}/verify`, { action, note });

export default API;
