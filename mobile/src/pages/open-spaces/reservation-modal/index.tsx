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

import type { DeskAvailability } from "@/hooks/use-open-spaces";
import type { ModalRef } from "@ssobkowski/rnui/modal";
import type { Ref } from "react";

interface ReservationModalProps {
  ref?: Ref<ModalRef>;
  deskId: number | null;
  deskLabel?: string | null;
  desks?: Pick<DeskAvailability, "id" | "data">[];
  isConfirming?: boolean;
  onConfirm: (selection: ReservationTimeSelection) => void;
}

export function ReservationModal({
  ref,
  deskId,
  deskLabel,
  desks,
  isConfirming,
  onConfirm,
}: ReservationModalProps) {
  const m = useModal();
  const [dateSelection, setDateSelection] = useState<ReservationDateSelection | null>(null);

  return (
    // @ts-ignore idiot
    <Modal id="reservation-modal" ref={ref}>
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
        isConfirming={isConfirming}
        onConfirm={onConfirm}
      />
    </Modal>
  );
}
