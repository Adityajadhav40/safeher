import axios from "axios";


const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1";


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});


/* =========================================================
   AUTH STORAGE HELPERS
========================================================= */

export const saveAuthToken = (token) => {
  if (token) {
    localStorage.setItem(
      "safeher_access_token",
      token
    );
  }
};


export const getAuthToken = () => {
  return localStorage.getItem(
    "safeher_access_token"
  );
};


export const saveUser = (user) => {
  if (user) {
    localStorage.setItem(
      "safeher_user",
      JSON.stringify(user)
    );
  }
};


export const getSavedUser = () => {
  const storedUser = localStorage.getItem(
    "safeher_user"
  );

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
};


export const clearAuth = () => {
  localStorage.removeItem(
    "safeher_access_token"
  );

  localStorage.removeItem(
    "safeher_user"
  );
};


/* =========================================================
   REQUEST INTERCEPTOR
========================================================= */

api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();

    if (token) {
      config.headers = config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);


/* =========================================================
   RESPONSE INTERCEPTOR
========================================================= */

api.interceptors.response.use(
  (response) => response,

  (error) => {
    if (error?.response?.status === 401) {
      clearAuth();

      if (
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/register"
      ) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);


/* =========================================================
   AUTH
========================================================= */

export const registerUser = async (
  userData
) => {
  const response = await api.post(
    "/auth/register",
    userData
  );

  return response.data;
};


export const loginUser = async (
  credentials
) => {
  const response = await api.post(
    "/auth/login",
    credentials
  );

  const data = response.data;

  if (data?.access_token) {
    saveAuthToken(
      data.access_token
    );
  }

  if (data?.user) {
    saveUser(data.user);
  }

  return data;
};


export const getCurrentUser = async () => {
  const response = await api.get(
    "/auth/me"
  );

  const user =
    response.data?.data ??
    response.data;

  saveUser(user);

  return user;
};


export const register =
  registerUser;

export const login =
  loginUser;

export const logout =
  clearAuth;


/* =========================================================
   LOCATION / SAFETY
========================================================= */

export const getLocationSafety = async (
  latitude,
  longitude
) => {
  const response = await api.post(
    "/location/safety",
    {
      latitude,
      longitude,
    }
  );

  return response.data;
};


export const getDistrictSafety = async (
  district
) => {
  const response = await api.get(
    `/safety/district/${encodeURIComponent(
      district
    )}`
  );

  return response.data;
};


/* =========================================================
   SOS
========================================================= */

export const createSOS = async (
  latitude,
  longitude,
  riskLevel = null,
  riskScore = null
) => {

  /*
   * Dashboard may pass the complete safety
   * response as the first argument.
   *
   * Normalize it here.
   */

  if (
    latitude &&
    typeof latitude === "object"
  ) {
    const safetyData = latitude;

    /*
     * Support both:
     *
     * {
     *   latitude,
     *   longitude,
     *   risk_level,
     *   risk_score
     * }
     *
     * and:
     *
     * {
     *   data: {
     *     location: {...},
     *     safety: {...}
     *   }
     * }
     */

    if (
      safetyData.data?.location
    ) {
      latitude =
        safetyData.data.location.latitude;

      longitude =
        safetyData.data.location.longitude;

      riskLevel =
        safetyData.data.safety?.risk_level ??
        safetyData.risk_level ??
        null;

      riskScore =
        safetyData.data.safety?.risk_score ??
        safetyData.risk_score ??
        null;
    } else {
      latitude =
        safetyData.latitude;

      longitude =
        safetyData.longitude;

      riskLevel =
        safetyData.risk_level ??
        safetyData.riskLevel ??
        null;

      riskScore =
        safetyData.risk_score ??
        safetyData.riskScore ??
        null;
    }
  }


  if (
    latitude === undefined ||
    latitude === null ||
    longitude === undefined ||
    longitude === null
  ) {
    throw new Error(
      "Current location is unavailable."
    );
  }


  const response = await api.post(
    "/sos",
    {
      latitude: Number(latitude),
      longitude: Number(longitude),
      risk_level:
        riskLevel || null,
      risk_score:
        riskScore !== null &&
        riskScore !== undefined
          ? Number(riskScore)
          : null,
    }
  );

  return response.data;
};


export const getSOSHistory = async () => {
  const response = await api.get(
    "/sos"
  );

  return response.data;
};


export const getSOS = async (
  sosId
) => {
  if (!sosId) {
    throw new Error(
      "SOS ID is required."
    );
  }

  const response = await api.get(
    `/sos/${sosId}`
  );

  return response.data;
};


export const cancelSOS = async (
  sosId
) => {
  if (!sosId) {
    throw new Error(
      "SOS ID is required."
    );
  }

  /*
   * Backend accepts both POST and PATCH.
   * Keep PATCH as the frontend contract.
   */

  const response = await api.patch(
    `/sos/${sosId}/cancel`
  );

  return response.data;
};


/* =========================================================
   EMERGENCY CONTACTS
========================================================= */

export const getContacts = async () => {
  const response = await api.get(
    "/contacts"
  );

  return response.data;
};


export const createContact = async (
  contact
) => {

  if (!contact) {
    throw new Error(
      "Contact information is required."
    );
  }


  const name =
    String(contact.name || "").trim();

  const phone =
    String(contact.phone || "").trim();

  const relationship =
    String(
      contact.relationship || ""
    ).trim();

  const email =
    String(
      contact.email || ""
    ).trim();


  if (!name) {
    throw new Error(
      "Contact name is required."
    );
  }

  if (!phone) {
    throw new Error(
      "Contact phone number is required."
    );
  }

  if (!relationship) {
    throw new Error(
      "Contact relationship is required."
    );
  }


  /*
   * IMPORTANT:
   *
   * Email is optional.
   *
   * When empty, send null.
   * When present, send the actual string.
   */

  const payload = {
    name,
    phone,
    relationship,
    email: email || null,
  };


  const response = await api.post(
    "/contacts",
    payload
  );


  return response.data;
};


export const deleteContact = async (
  contactId
) => {

  const id =
    contactId?.id ||
    contactId?.contact_id ||
    contactId;


  if (!id) {
    throw new Error(
      "Contact ID is required."
    );
  }


  const response = await api.delete(
    `/contacts/${encodeURIComponent(id)}`
  );


  return response.data;
};


/* =========================================================
   CONTACT COMPATIBILITY ALIASES
========================================================= */

export const getEmergencyContacts =
  getContacts;


export const addEmergencyContact =
  createContact;


export const removeEmergencyContact =
  deleteContact;


/* =========================================================
   AUTH STATE
========================================================= */

export const isAuthenticated = () => {
  return Boolean(
    getAuthToken()
  );
};


export const getStoredUser = () => {
  return getSavedUser();
};


/* =========================================================
   AXIOS INSTANCE
========================================================= */

export default api;