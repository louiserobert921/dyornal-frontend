import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

/**
 * The primary action of the whole app: one large, unmissable target that starts
 * a recording. Sized at 200px on desktop and shrunk on small screens, where
 * 200px would crowd out everything else.
 */
export function RecordButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label="Record a transaction"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className="animate-record-pulse flex size-40 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-full border-none bg-record-500 text-white shadow-lg outline-none hover:bg-record-600 focus-visible:ring-4 focus-visible:ring-record-400/60 sm:size-50"
    >
      <Plus size={40} strokeWidth={2.5} aria-hidden />
      <span className="text-xl font-extrabold tracking-widest sm:text-2xl">RECORD</span>
    </motion.button>
  );
}
