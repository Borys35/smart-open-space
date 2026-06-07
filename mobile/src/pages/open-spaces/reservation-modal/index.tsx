import {
  ReservationDateStep,
  type ReservationDateSelection,
} from "@/pages/open-spaces/reservation-modal/date-step";
import {
  ReservationTimeStep,
  type ReservationTimeSelection,
} from "@/pages/open-spaces/reservation-modal/time-step";
import { Modal, useModal } from "@ssobkowski/rnui";
import { useState } from "react";

import type { ModalRef } from "@ssobkowski/rnui";
import type { Ref } from "react";

interface ReservationModalProps {
  ref?: Ref<ModalRef>;
  deskId: number | null;
  deskLabel?: string | null;
  onConfirm: (selection: ReservationTimeSelection) => void;
}

export function ReservationModal({ ref, deskId, deskLabel, onConfirm }: ReservationModalProps) {
  const m = useModal();
  const [dateSelection, setDateSelection] = useState<ReservationDateSelection | null>(null);

  return (
    // @ts-ignore idiot
    <Modal id="reservation-modal" ref={ref}>
      <ReservationDateStep
        deskId={deskId}
        deskLabel={deskLabel}
        onNext={(selection) => {
          setDateSelection(selection);
          m.goToStep(1);
        }}
      />
      <ReservationTimeStep windows={dateSelection?.windows ?? []} onConfirm={onConfirm} />
    </Modal>
  );
}
