'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { ExplorerLink } from '../cluster/cluster-ui';
import { AppHero, ellipsify } from '../ui/ui-layout';
import { useBasicProgram } from './basic-data-access';
import { BasicCreate, BasicProgram } from './basic-ui';

export default function BasicFeature() {
  const { publicKey } = useWallet();
  const { programId } = useBasicProgram();

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="flex flex-col items-center justify-center text-center">
        <AppHero
          title="Mint Option"
          subtitle={
            <div className="space-y-4">
              <p>Run the program by clicking the &quot;Run program&quot; button.</p>
              <p>
                <ExplorerLink
                  path={`account/${programId}`}
                  label={ellipsify(programId.toString())}
                />
              </p>
              <BasicCreate />
            </div>
          }
        />
        
        {publicKey ? (
          <div className="max-w-xl w-full">
            <BasicProgram />
          </div>
        ) : (
          <p className="text-lg text-muted-foreground">
            Connect your wallet to get started
          </p>
        )}
      </div>
    </div>
  );
}
