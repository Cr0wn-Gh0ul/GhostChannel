interface LockedConversationProps {
  deviceName?: string;
  deviceId?: string;
  friendName: string;
}

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-16 w-16">
    <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
  </svg>
);

export function LockedConversation({ deviceName, deviceId, friendName }: LockedConversationProps) {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full mx-auto p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-gray-200 dark:bg-gray-700 p-6">
            <LockIcon />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Conversation Locked
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This conversation with <span className="font-semibold text-gray-900 dark:text-white">{friendName}</span> was created on a different device and can only be decrypted there.
        </p>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Device Name</p>
            <p className="text-base font-semibold text-gray-900 dark:text-white">
              {deviceName || 'Unknown Device'}
            </p>
          </div>
          
          {deviceId && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Device ID</p>
              <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                {deviceId}
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <span className="font-semibold">End-to-end encrypted:</span> Each device has its own encryption keys. 
            To access this conversation, switch to the device where it was created.
          </p>
        </div>
      </div>
    </div>
  );
}
