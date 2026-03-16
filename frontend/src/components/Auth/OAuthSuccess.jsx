import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const { loadUser } = useAuth();
  const [status, setStatus] = useState("Signing you in...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);
      loadUser()
        .then(() => {
          setStatus("Success! Redirecting...");
          navigate("/properties");
        })
        .catch(() => {
          setStatus("Something went wrong. Redirecting to login...");
          navigate("/login");
        });
    } else {
      navigate("/login");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
};

export default OAuthSuccess;
