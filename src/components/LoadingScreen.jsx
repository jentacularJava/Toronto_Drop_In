export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Loading Toronto Sports Schedules
        </h2>
        <p className="text-gray-600">
          Please wait while we load the database...
        </p>
      </div>
    </div>
  );
}