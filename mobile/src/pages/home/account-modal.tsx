import { Button } from "@ssobkowski/rnui/button";
import {
  ChainLinkIcon,
  ChainUnlinkIcon,
  LogoutIcon,
  WarningIconFilled,
} from "@ssobkowski/rnui/icons";
import { Modal, ModalHeader, ModalStepView, useModal } from "@ssobkowski/rnui/modal";
import { Text } from "@ssobkowski/rnui/text";
import { Platform, View } from "react-native";
import { FadeIn, FadeOut } from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import type { ModalRef } from "@ssobkowski/rnui/modal";
import type { Ref } from "react";

const HEADER_ENTERING = FadeIn.duration(200);
const HEADER_EXITING = FadeOut.duration(200);

interface AccountModalProps {
  ref?: Ref<ModalRef>;
  hasLinkedCard: boolean;
  onLinkCard: () => void;
  onLogout: () => void;
  onUnlinkCard: () => void;
  isUnlinking: boolean;
}

export function AccountModal({
  ref,
  hasLinkedCard,
  onLinkCard,
  onLogout,
  onUnlinkCard,
  isUnlinking,
}: AccountModalProps) {
  const { theme } = useUnistyles();
  const m = useModal();

  const handleLinkCard = () => {
    m.dismiss();
    onLinkCard();
  };

  const handleLogout = () => {
    m.dismiss();
    onLogout();
  };

  const handleOpenUnlinkStep = () => {
    m.goToStep(1);
  };

  return (
    // @ts-ignore rnui modal ref typing
    <Modal id="account-modal" ref={ref}>
      <View style={styles.modal}>
        <ModalHeader>
          <Text
            willAnimate
            header
            key={m.currentStep}
            entering={HEADER_ENTERING}
            exiting={HEADER_EXITING}
            color="black"
            size="2xl"
            weight="medium"
          >
            {m.currentStep === 0 ? "Account" : "Unlink Card"}
          </Text>
        </ModalHeader>

        <ModalStepView index={0} style={styles.content}>
          {!hasLinkedCard ? (
            <Button onPress={handleLinkCard} style={styles.button} variant="primary">
              <ChainLinkIcon color={theme.colors.text.secondary} size={24} strokeWidth={2} />
              <Text tone="text.secondary" size="lg" weight="medium">
                Connect Card
              </Text>
            </Button>
          ) : (
            <Button onPress={handleOpenUnlinkStep} style={styles.button} variant="primary">
              <ChainUnlinkIcon color={theme.colors.text.secondary} size={24} strokeWidth={2} />
              <Text tone="text.secondary" size="lg" weight="medium">
                Unlink Card
              </Text>
            </Button>
          )}

          <Button
            onPress={handleLogout}
            style={[styles.button, styles.destructiveButton]}
            variant="primary"
          >
            <LogoutIcon color={theme.colors.button.destructive} size={24} strokeWidth={2} />
            <Text tone="button.destructive" size="lg" weight="medium">
              Sign Out
            </Text>
          </Button>
        </ModalStepView>

        <ModalStepView index={1} style={styles.warningContent}>
          <WarningIconFilled size={80} color="#FF9A02" style={styles.warningIcon} />

          <Text size="lg" tone="text.secondary" style={styles.warningText}>
            This card will be removed from your account. It won't unlock doors when scanned at a
            gate reader unless you link it again.
            {Platform.OS === "android" && " You will still be able to use your phone."}
          </Text>

          <View style={styles.bottomButtons}>
            <Button
              variant="secondary"
              style={styles.actionButton}
              disabled={isUnlinking}
              onPress={m.goBack}
            >
              <Text size="lg" weight="medium" color="black">
                Cancel
              </Text>
            </Button>

            <Button
              variant="primary"
              style={[styles.actionButton, styles.confirmButton]}
              disabled={isUnlinking}
              onPress={onUnlinkCard}
            >
              <ChainUnlinkIcon color="white" size={20} strokeWidth={2} />
              <Text size="lg" weight="medium" color="white">
                Confirm
              </Text>
            </Button>
          </View>
        </ModalStepView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  modal: {
    padding: 24,
  },
  content: {
    gap: 8,
  },
  button: {
    flex: 1,
    gap: 16,
    justifyContent: "flex-start",
    paddingLeft: 20,
    backgroundColor: "#F8F8FA",
  },
  destructiveButton: {
    backgroundColor: "#FFE2E3",
  },
  warningContent: {
    padding: 0,
    paddingTop: 8,
    alignItems: "center",
    gap: 14,
  },
  warningIcon: {
    alignSelf: "center",
  },
  warningText: {
    textAlign: "center",
  },
  errorText: {
    textAlign: "center",
  },
  bottomButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    minHeight: 52,
  },
  confirmButton: {
    backgroundColor: theme.colors.button.destructive,
  },
}));
