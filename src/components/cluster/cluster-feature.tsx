'use client'

import { useState } from 'react'
import { AppHero } from '../ui/ui-layout'
import { ClusterUiModal } from './cluster-ui'
import { ClusterUiTable } from './cluster-ui'

/**
 * ClusterFeature component for managing and selecting Solana clusters.
 * It renders a UI section with an AppHero component, a button to add a cluster,
 * and a table to display cluster data.
 * 
 * @component
 * @example
 * return (
 *   <ClusterFeature />
 * )
 */
export default function ClusterFeature() {
  /**
   * State to control the visibility of the cluster modal.
   * 
   * @type {boolean}
   */
  const [showModal, setShowModal] = useState(false)

  return (
    <div>
      <AppHero title="Clusters" subtitle="Manage and select your Solana clusters">
        <ClusterUiModal show={showModal} hideModal={() => setShowModal(false)} />
        <button className="btn btn-xs lg:btn-md btn-primary" onClick={() => setShowModal(true)}>
          Add Cluster
        </button>
      </AppHero>
      <ClusterUiTable />
    </div>
  )
}
