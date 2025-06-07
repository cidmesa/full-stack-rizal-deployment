import ActionButton, {
  ButonSize,
  ButtonVariant,
} from "@/src/components/ActionButton";
import { Edit, Sidebar } from "lucide-react";

interface ChatHeaderProps {
  onNewChat: () => void;
  toggleSidebar: () => void;
}

export default function ChatHeader({
  onNewChat,
  toggleSidebar,
}: ChatHeaderProps) {
  return (
    <div
      className="
        flex flex-row
        w-full
        p-4
        bg-peach
        items-center justify-between
      "
    >
      <div
        className="
          flex flex-row
          justify-center items-center gap-2
        "
      >
        <button onClick={toggleSidebar}>
          <Sidebar
            className="
              text-brown
              cursor-pointer
            "
          />
        </button>
        <h1
          className="
            text-blue text-3xl font-maragsa
          "
        >
          Rizal
          <span
            className="
              text-red
            "
          >
            GPT
          </span>
        </h1>
      </div>
      <ActionButton
        color="brown"
        label={
          <span
            className="
              hidden
              sm:inline
            "
          >
            New Conversation
          </span>
        }
        size={ButonSize.Compact}
        variant={ButtonVariant.Filled}
        onClick={onNewChat}
        icon={Edit}
      />
    </div>
  );
}
