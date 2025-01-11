export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center">
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}
