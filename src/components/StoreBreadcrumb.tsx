"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useEffect, useSyncExternalStore, type MouseEvent } from "react";
import {
  buildStoresListUrl,
  clearOpenedFromList,
  getRememberedStoresList,
  rememberProject,
  wasOpenedFromList,
} from "@/lib/store-navigation";

type StoreBreadcrumbProps = {
  storeId: string;
  storeName: string;
  projectId?: string;
  projectName?: string;
  categoryId: string;
  categoryLabel: string;
};

export function StoreBreadcrumb({ storeId, storeName, projectId, projectName, categoryId, categoryLabel }: StoreBreadcrumbProps) {
  const router = useRouter();
  const projectListUrl = buildStoresListUrl({ projectId });
  const categoryListUrl = buildStoresListUrl({ projectId, category: categoryId });
  const rememberedList = useSyncExternalStore(subscribeToNothing, getRememberedStoresList, getNoRememberedList);
  const rememberedListProject = rememberedList ? new URLSearchParams(rememberedList.split("?")[1] ?? "").get("project") : null;
  // Return to the exact list (category, search, page) the visitor came from when
  // it was for this project or for all projects; otherwise open this project's stores.
  const canReturnToRememberedList =
    Boolean(rememberedList) && (!rememberedListProject || rememberedListProject === "all" || rememberedListProject === projectId);
  const backHref = canReturnToRememberedList && rememberedList ? rememberedList : projectListUrl;
  const backTargetsThisProject = !canReturnToRememberedList || rememberedListProject === projectId;

  useEffect(() => {
    // Viewing a store means the visitor is in this project: make it the default
    // the next time they open the store list.
    if (projectId) rememberProject(projectId);
  }, [projectId]);

  function goBack(event: MouseEvent<HTMLAnchorElement>) {
    if (!wasOpenedFromList(storeId)) return;
    // Opened straight from the list in this tab: go back in history so the
    // list keeps its scroll position.
    event.preventDefault();
    clearOpenedFromList();
    router.back();
  }

  const backLabel = projectName && backTargetsThisProject ? `Gian hàng tại ${projectName}` : "Quay lại danh sách gian hàng";

  return (
    <div className="mb-3 grid gap-2">
      <Link
        className="inline-flex w-fit items-center gap-2 rounded-full border border-masterise-line bg-white px-3 py-1.5 text-sm font-semibold text-masterise-primary transition hover:border-masterise-primary hover:bg-masterise-soft"
        href={backHref}
        onClick={goBack}
      >
        <ArrowLeft size={16} aria-hidden />
        {backLabel}
      </Link>
      <nav aria-label="Breadcrumb gian hàng" className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase text-masterise-primary">
        <Link className="shrink-0 transition hover:text-masterise-dark" href="/gian-hang">
          Gian hàng
        </Link>
        {projectName ? (
          <>
            <span aria-hidden className="shrink-0 text-masterise-muted">
              /
            </span>
            <Link className="min-w-0 truncate transition hover:text-masterise-dark" href={projectListUrl}>
              {projectName}
            </Link>
          </>
        ) : null}
        <span aria-hidden className="shrink-0 text-masterise-muted">
          /
        </span>
        <Link className="min-w-0 truncate transition hover:text-masterise-dark" href={categoryListUrl}>
          {categoryLabel}
        </Link>
        <span aria-hidden className="shrink-0 text-masterise-muted">
          /
        </span>
        <span className="min-w-0 truncate text-masterise-muted" aria-current="page">
          {storeName}
        </span>
      </nav>
    </div>
  );
}

function subscribeToNothing() {
  return () => undefined;
}

function getNoRememberedList() {
  return null;
}
