import { UserProfile } from "@clerk/nextjs";

const AccountPage = () => {
  return (
    <div className="flex flex-1 items-center justify-center">
      <UserProfile />
    </div>
  );
};

export default AccountPage;
