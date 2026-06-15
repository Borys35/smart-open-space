import {
  ReservationDateStep,
  type ReservationDateSelection,
} from "@/pages/open-spaces/reservation-modal/date-step";
import {
  ReservationTimeStep,
  type ReservationTimeSelection,
} from "@/pages/open-spaces/reservation-modal/time-step";
import { Modal, useModal } from "@ssobkowski/rnui/modal";
import { useState } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import type { DeskAvailability } from "@/hooks/use-open-spaces";
import type { ModalRef } from "@ssobkowski/rnui/modal";
import type { Ref } from "react";

interface ReservationModalProps {
  ref?: Ref<ModalRef>;
  deskId: number | null;
  deskLabel?: string | null;
  desks?: Pick<DeskAvailability, "id" | "data">[];
  creditsPerHour: number;
  creditsBalance: number | null;
  maxDailyHours: number;
  isConfirming?: boolean;
  onConfirm: (selection: ReservationTimeSelection) => void;
}

export function ReservationModal({
  ref,
  deskId,
  deskLabel,
  desks,
  creditsPerHour,
  creditsBalance,
  maxDailyHours,
  isConfirming,
  onConfirm,
}: ReservationModalProps) {
  const m = useModal();
  const [dateSelection, setDateSelection] = useState<ReservationDateSelection | null>(null);

  return (
    // @ts-ignore idiot
    <Modal id="reservation-modal" ref={ref}>
      <View style={styles.modal}>
        <ReservationDateStep
          deskId={deskId}
          deskLabel={deskLabel}
          desks={desks}
          onNext={(selection) => {
            setDateSelection(selection);
            m.goToStep(1);
          }}
        />
        <ReservationTimeStep
          windows={dateSelection?.windows ?? []}
          deskWindows={dateSelection?.deskWindows ?? []}
          creditsPerHour={creditsPerHour}
          creditsBalance={creditsBalance}
          maxDailyHours={maxDailyHours}
          isConfirming={isConfirming}
          onConfirm={onConfirm}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 24,
  },
});
