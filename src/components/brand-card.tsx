import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  companyName: string;
  logoPath: string | null;
  subtitle: string;
  children: React.ReactNode;
};

// Moldura das telas de entrar e criar conta, com o logo da empresa
export function BrandCard({ companyName, logoPath, subtitle, children }: Props) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-6 py-2">
          <div className="flex flex-col items-center gap-3 text-center">
            {logoPath ? (
              <Image
                src={logoPath}
                alt={companyName}
                width={128}
                height={128}
                priority
                className="size-32"
              />
            ) : (
              <p className="text-primary text-3xl font-bold tracking-tight">{companyName}</p>
            )}
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          </div>
          {children}
        </CardContent>
      </Card>
    </main>
  );
}
