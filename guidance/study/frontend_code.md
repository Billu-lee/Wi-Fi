# BilluNet Captive Portal System: Frontend Code-by-Code Study Guide

This document breaks down the React/Vite/TypeScript frontend implementation of the captive portal.

---

## 1. Landing Redirection & Query Parameter Parsing

When a client is intercepted by the router, they are directed to the portal landing page with router-injected variables. The portal must parse, store, and utilize these parameters.

### Query Parser & Bootstrapping: `PortalLandingPage.tsx`
This page captures the URL parameters, stores them in context, calls the backend identifier, and routes the user based on the API response.

```tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getPortalContext, identifyPortal } from "../services/portalApi";
import { usePortalContext } from "../context/PortalContext";

export function PortalLandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setCaptiveContext, setVerifiedCustomer } = usePortalContext();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
    // Check if we have a server-persisted portalSessionId or raw query parameters
    const portalSessionId = params.get("portalSessionId") || "";
    let cancelled = false;

    async function bootstrapPortal() {
      try {
        // Step 1: Load/Parse variables
        const payload = portalSessionId
          ? await loadPortalContextFromSession(portalSessionId)
          : loadPortalContextFromQuery(params);

        if (cancelled) return;

        // Step 2: Write to global context state
        setCaptiveContext(payload);

        // Step 3: Trigger identify request to Spring Boot
        const response = await identifyPortal(payload);

        if (cancelled) return;

        // Step 4: Map session details if verified
        if (response.portalContext) {
          setCaptiveContext(response.portalContext);
        }
        if (response.customer?.id && response.device?.id) {
          setVerifiedCustomer({
            customerId: response.customer.id,
            customerPhone: response.customer.phoneNumber,
            deviceId: response.device.id,
            macAddress: response.device.macAddress,
          });
        }

        // Step 5: Direct the router browser to the correct page
        navigate(nextRoute(response.nextStep), { replace: true });
      } catch (requestError) {
        if (cancelled) return;
        setError(getApiErrorMessage(requestError));
      }
    }

    void bootstrapPortal();

    return () => {
      cancelled = true;
    };
  }, [location.search, navigate, setCaptiveContext, setVerifiedCustomer]);
  
  // Render loading indicator or error ...
}

// Maps query parameters into a standard TS interface
function loadPortalContextFromQuery(params: URLSearchParams): PortalRequestContext {
  const macAddress = params.get("clientmac") || params.get("macAddress") || params.get("mac") || "";
  return {
    macAddress,
    clientIp: params.get("clientip") || "",
    gatewayName: params.get("gatewayname") || "",
    token: params.get("tok") || params.get("token") || "",
    redir: params.get("redir") || "",
    authAction: params.get("authaction") || "",
    routerCode: params.get("router_code") || params.get("routerCode") || "",
    locationCode: params.get("location_code") || "",
    routerName: params.get("router_name") || params.get("routerName") || "",
    linkLogin: params.get("link_login") || params.get("linkLogin") || "",
    linkOrig: params.get("link_orig") || params.get("linkOrig") || "",
    ssid: params.get("ssid") || "",
  };
}
```

---

## 2. Phone Verification & OTP Submission

### OTP Form Logic: `PhoneVerificationPage.tsx`
Handles phone input, calling OTP API triggers, countdown cooling timers, and verifying guest submissions.

```tsx
export function PhoneVerificationPage() {
  const navigate = useNavigate();
  const { store, setSwapCandidate, setVerifiedCustomer } = usePortalContext();
  const [phoneNumber, setPhoneNumber] = useState(store.customerPhone ?? "");
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  
  // Cooldown countdown timer effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((val) => Math.max(val - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const macAddress = store.captive.macAddress;
  const portalContext = macAddress ? { macAddress, ... } : null;

  async function handleSendOtp() {
    setBusy(true);
    try {
      const response = await sendOtp({ phoneNumber, ...portalContext });
      setOtpSent(true);
      setCooldown(response.cooldownSeconds);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp() {
    setBusy(true);
    try {
      const response = await verifyOtp({ phoneNumber, otp, ...portalContext });
      
      // Update global context state with verified credentials
      setVerifiedCustomer({
        customerId: response.customerId,
        customerPhone: response.customerPhone,
        deviceId: response.deviceId,
        macAddress: response.macAddress,
      });
      setSwapCandidate(response.swapCandidate ?? null);

      if (response.nextStep === "SWAP_OR_BUY") {
        navigate("/portal/device-choice", { replace: true });
        return;
      }
      navigate("/portal/plans", { replace: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }
}
```

---

## 3. Active Session Redirect Handshake

Once the session is confirmed active (e.g. payment has completed), the frontend redirects the client back to the router's local gateway.

### Continuing to the Internet: `SessionActivePage.tsx`
The portal retrieves the redirection target URL (which includes the PAP credentials like `username` and `password`) and updates the browser's location.

```tsx
export function SessionActivePage() {
  const navigate = useNavigate();
  const { setCaptiveContext, store } = usePortalContext();
  const [status, setStatus] = useState<PortalStatusResponse | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  const continueUrl = status?.continueUrl ?? null;

  // Poll status periodically (every 30 seconds) to detect status changes
  useEffect(() => {
    void loadStatus();
    const timer = window.setInterval(() => {
      void loadStatus(true);
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  // When status becomes KNOWN_ACTIVE_SESSION, initiate automatic redirect countdown
  useEffect(() => {
    if (status?.nextStep === "KNOWN_ACTIVE_SESSION" && continueUrl && !isRedirecting) {
      setIsRedirecting(true);
    }
  }, [status, continueUrl, isRedirecting]);

  // Execute countdown tick
  useEffect(() => {
    if (isRedirecting && redirectCountdown > 0) {
      const timer = window.setTimeout(() => {
        setRedirectCountdown(prev => prev - 1);
      }, 1000);
      return () => window.clearTimeout(timer);
    } else if (isRedirecting && redirectCountdown === 0) {
      void handleContinue();
    }
  }, [isRedirecting, redirectCountdown]);

  async function handleContinue() {
    try {
      let resolvedContinueUrl = continueUrl;

      // If URL isn't present in status, request it from the backend continue endpoint
      if (!resolvedContinueUrl && portalContext) {
        const response = await continueToInternet(portalContext);
        resolvedContinueUrl = response.continueUrl ?? null;
      }

      if (!resolvedContinueUrl) {
        setError("Missing router continue redirect URL");
        return;
      }

      // Redirection: Browser loads the router's authorization endpoint
      // e.g. http://192.168.88.1/login?username=AA:BB:CC...&password=AA:BB:CC...&dst=http://neverssl.com
      window.location.href = resolvedContinueUrl;
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }
}
```
