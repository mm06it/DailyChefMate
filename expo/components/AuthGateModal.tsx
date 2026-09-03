import React from "react";
import { Modal } from "react-native";

import AuthScreen from "@/app/auth";
import { useAuthGate } from "@/hooks/use-auth-gate";

// The login overlay. Mounted once at the app root; shown by `requireAuth`.
export default function AuthGateModal() {
  const { visible, closeGate } = useAuthGate();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={closeGate}
      transparent={false}
      statusBarTranslucent
    >
      {visible && <AuthScreen embedded onClose={closeGate} />}
    </Modal>
  );
}
