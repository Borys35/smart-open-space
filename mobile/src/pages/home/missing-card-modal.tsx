import { Button } from "@ssobkowski/rnui/button";
import { PostcardIconFilled, WarningIconFilled } from "@ssobkowski/rnui/icons";
import { Modal, ModalHeader, ModalStepView, useModal } from "@ssobkowski/rnui/modal";
import { Text, TextMorph } from "@ssobkowski/rnui/text";
import { router } from "expo-router";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import type { ModalRef } from "@ssobkowski/rnui/modal";
import type { Ref } from "react";

interface MissingCardModalProps {
  ref?: Ref<ModalRef>;
}

export function MissingCardModal({ ref }: MissingCardModalProps) {
  const m = useModal();

  const handleContinue = () => {
    m.dismiss();
    router.push("/nfc-card");
  };

  return (
    // @ts-ignore rnui modal ref typing
    <Modal id="missing-card-modal" ref={ref}>
      <View style={styles.header}>
        <ModalHeader>
          <TextMorph header granularity="word" color="black" size="2xl" weight="medium">
            Add Card
          </TextMorph>
        </ModalHeader>
      </View>

      <ModalStepView index={0} style={styles.content}>
        <View style={styles.cardWarningIcon}>
          <PostcardIconFilled color="black" size={84} />
          <WarningIconFilled color="#FF9A02" size={40} style={styles.cardWarningBadge} />
        </View>

        <Text size="lg" tone="text.secondary" style={styles.details}>
          You haven't added your card yet, would you like to do it now?
        </Text>
      </ModalStepView>

      <View style={styles.bottomButtons}>
        <Button variant="secondary" style={styles.actionButton} onPress={m.dismiss}>
          <Text size="lg" weight="medium" color="black">
            Cancel
          </Text>
        </Button>

        <Button
          variant="primary"
          style={[styles.actionButton, styles.continueButton]}
          onPress={handleContinue}
        >
          <Text size="lg" weight="medium" color="white">
            Continue
          </Text>
        </Button>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 24,
    marginHorizontal: 24,
  },
  content: {
    padding: 0,
    paddingHorizontal: 24,
    paddingBottom: 12,
    alignItems: "center",
    gap: 14,
  },
  cardWarningIcon: {
    width: 104,
    height: 104,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  cardWarningBadge: {
    position: "absolute",
    right: 6,
    bottom: 8,
  },
  details: {
    textAlign: "center",
    marginBottom: 12,
  },
  bottomButtons: {
    flexDirection: "row",
    marginBottom: 24,
    marginHorizontal: 24,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexBasis: 0,
    minHeight: 52,
  },
  continueButton: {
    backgroundColor: "#00B2FF",
  },
});
