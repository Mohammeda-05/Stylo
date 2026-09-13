// RevenueCat payment service for STYLO
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, {
    CustomerInfo,
    LOG_LEVEL,
    PurchasesPackage,
    PACKAGE_TYPE
} from 'react-native-purchases';

// Use the entitlement ID everywhere for gating
const ENTITLEMENT_ID = 'pro'; // must exactly match RC dashboard

export interface PurchaseResult {
    success: boolean;
    productId?: string;
    transactionId?: string;
    error?: string;
}

export interface Product {
    id: string; // App Store product ID
    rcPackageId: string; // RevenueCat package ID
    title: string;
    description: string;
    price: string;
    priceAmountMicros: number;
    priceCurrencyCode: string;
    package: PurchasesPackage; // Store the actual package for purchasing
}

type RCStoreProduct = {
    productIdentifier?: string;  // iOS typical
    identifier?: string;         // alternative shape
    title?: string;
    description?: string;
    priceString?: string;
    price?: number;
    currencyCode?: string;
};

// Helper function to check pro entitlement
function hasPro(info?: CustomerInfo | null): boolean {
    return !!info?.entitlements?.active?.[ENTITLEMENT_ID];
}

function getStoreProductFromPackage(pkg: PurchasesPackage): RCStoreProduct | undefined {
    const anyPkg = pkg as any;
    return anyPkg?.storeProduct ?? anyPkg?.product ?? undefined;
}

class PaymentService {
    private isInitialized = false;
    private customerInfoListener: (() => void) | null = null;
    private customerInfoRemoveListener: (() => void) | null = null;

    private getApiKey(): string | undefined {
        if (Platform.OS === 'ios') {
            return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
        }
        return undefined;
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) return;


        const isExpoGo = __DEV__ && Constants.appOwnership === 'expo';

        if (isExpoGo) {
            this.isInitialized = true;
            return;
        }

        const apiKey = this.getApiKey();


        if (!apiKey) {
            const errorMsg = `Missing RevenueCat API key for ${Platform.OS}`;
            console.error("PaymentService:");
            throw new Error(errorMsg);
        }

        try {
            Purchases.setLogLevel(LOG_LEVEL.ERROR);
            await Purchases.configure({ apiKey });
            this.isInitialized = true;
        } catch (error) {
            console.error("PaymentService: Failed to initialize RevenueCat:");
            throw error;
        }
    }

    // Subscribe to entitlement changes (restores, family sharing, billing issues)
    setupCustomerInfoListener(onProStatusChange: (isPro: boolean) => void): () => void {
        // Clean up existing listener
        if (this.customerInfoRemoveListener) {
            this.customerInfoRemoveListener();
            this.customerInfoRemoveListener = null;
        }

        const isExpoGo = __DEV__ && Constants.appOwnership === 'expo';
        if (isExpoGo) {
            // For Expo Go, return a no-op cleanup function
            return () => {};
        }

        // Store the callback
        this.customerInfoListener = () => {
            // This will be called when we want to remove the listener
        };

        // Add the listener (returns void)
        Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
            const isPro = hasPro(info);
            onProStatusChange(isPro);
        });

        // Return cleanup function
        this.customerInfoRemoveListener = () => {
            // RevenueCat doesn't provide a way to remove individual listeners
            // The listener will be cleaned up when the app closes
            this.customerInfoListener = null;
        };

        return this.customerInfoRemoveListener;
    }

    // Refresh entitlements from server
    async refreshEntitlements(): Promise<boolean> {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const info = await Purchases.getCustomerInfo();
            const isPro = hasPro(info);


            return isPro;
        } catch (error) {
            console.error("PaymentService: Failed to refresh entitlements:");
            return false;
        }
    }

    private getMockProducts(): Product[] {
        if (!__DEV__ || Constants.appOwnership !== 'expo') {
            throw new Error('Subscriptions unavailable. Please try again later.');
        }
        return [
            {
                id: 'stylo_monthly',
                rcPackageId: '$rc_monthly',
                title: 'STYLO Monthly',
                description: 'Monthly subscription with unlimited outfit evaluations, AI style coaching, and premium wardrobe features. 3-day free trial.',
                price: '$6.99',
                priceAmountMicros: 6990000,
                priceCurrencyCode: 'USD',
                package: {} as PurchasesPackage // Mock package
            },
            {
                id: 'stylo_annual',
                rcPackageId: '$rc_annual',
                title: 'STYLO Annual',
                description: 'Annual subscription with unlimited outfit evaluations, AI style coaching, and premium wardrobe features. Save 50%!',
                price: '$49.99',
                priceAmountMicros: 49990000,
                priceCurrencyCode: 'USD',
                package: {} as PurchasesPackage // Mock package
            }
        ];
    }

    async getProducts(): Promise<Product[]> {
        const isExpoGo = __DEV__ && Constants.appOwnership === 'expo';

        if (isExpoGo) {
            return this.getMockProducts();
        }

        const apiKey = this.getApiKey();

        if (!apiKey) {
            throw new Error(`RevenueCat not configured for ${Platform.OS}`);
        }

        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const offerings = await Purchases.getOfferings();

            const currentOffering = offerings.current;

            if (!currentOffering) {
                console.warn("PaymentService: No current offering found");
                throw new Error('Subscriptions unavailable. Please try again later.');
            }

            const pkgs = currentOffering.availablePackages ?? [];

            if (pkgs.length === 0) {
                console.warn("PaymentService: No packages available");
                throw new Error('Subscriptions unavailable. Please try again later.');
            }

            const products: Product[] = [];

            // Get both monthly and yearly packages if available
            const monthlyPackage = pkgs.find(p => p.packageType === PACKAGE_TYPE.MONTHLY);
            const yearlyPackage = pkgs.find(p => p.packageType === PACKAGE_TYPE.ANNUAL);

            // Add monthly package
            if (monthlyPackage) {
                const sp = getStoreProductFromPackage(monthlyPackage);
                if (sp) {
                    const productId = sp.productIdentifier ?? sp.identifier;
                    if (productId) {
                        const priceNumber = typeof sp.price === 'number' ? sp.price : Number(sp.price ?? 0);
                        products.push({
                            id: productId,
                            rcPackageId: monthlyPackage.identifier,
                            title: sp.title || 'STYLO Pro Monthly',
                            description: sp.description || 'Monthly subscription with unlimited outfit evaluations and AI style coaching',
                            price: sp.priceString ?? `$${priceNumber.toFixed(2)}`,
                            priceAmountMicros: Math.round(priceNumber * 1_000_000),
                            priceCurrencyCode: sp.currencyCode ?? 'USD',
                            package: monthlyPackage
                        });
                    }
                }
            }

            // Add yearly package
            if (yearlyPackage) {
                const sp = getStoreProductFromPackage(yearlyPackage);
                if (sp) {
                    const productId = sp.productIdentifier ?? sp.identifier;
                    if (productId) {
                        const priceNumber = typeof sp.price === 'number' ? sp.price : Number(sp.price ?? 0);
                        products.push({
                            id: productId,
                            rcPackageId: yearlyPackage.identifier,
                            title: sp.title || 'STYLO Pro Yearly',
                            description: sp.description || 'Annual subscription with unlimited outfit evaluations and AI style coaching. Save 50%!',
                            price: sp.priceString ?? `$${priceNumber.toFixed(2)}`,
                            priceAmountMicros: Math.round(priceNumber * 1_000_000),
                            priceCurrencyCode: sp.currencyCode ?? 'USD',
                            package: yearlyPackage
                        });
                    }
                }
            }

            // If no specific packages found, use the first available
            if (products.length === 0 && pkgs.length > 0) {
                const firstPackage = pkgs[0];
                const sp = getStoreProductFromPackage(firstPackage);
                if (sp) {
                    const productId = sp.productIdentifier ?? sp.identifier;
                    if (productId) {
                        const priceNumber = typeof sp.price === 'number' ? sp.price : Number(sp.price ?? 0);
                        products.push({
                            id: productId,
                            rcPackageId: firstPackage.identifier,
                            title: sp.title || 'STYLO Pro',
                            description: sp.description || 'Premium subscription with unlimited outfit evaluations',
                            price: sp.priceString ?? `$${priceNumber.toFixed(2)}`,
                            priceAmountMicros: Math.round(priceNumber * 1_000_000),
                            priceCurrencyCode: sp.currencyCode ?? 'USD',
                            package: firstPackage
                        });
                    }
                }
            }

            if (products.length === 0) {
                console.warn("PaymentService: No valid products found");
                throw new Error('Subscriptions unavailable. Please try again later.');
            }


            return products;

        } catch (error: unknown) {
            console.error("PaymentService: Failed to get products:");
            throw new Error('Subscriptions unavailable. Please try again later.');
        }
    }

    private async mockPurchase(productId: string): Promise<PurchaseResult> {
        if (!__DEV__ || Constants.appOwnership !== 'expo') {
            throw new Error('Subscriptions unavailable. Please try again later.');
        }

        // Set mock pro status in AsyncStorage
        try {
            await AsyncStorage.setItem('stylo_pro_status', 'true');
            await AsyncStorage.setItem('stylo_subscription_type', productId.includes('yearly') ? 'yearly' : 'monthly');
        } catch (error) {
            console.warn("PaymentService: Failed to set mock pro status:");
        }

        // Simulate a successful purchase
        return {
            success: true,
            productId: productId,
            transactionId: `stylo_mock_${Date.now()}`
        };
    }

    async purchaseProduct(productId: string): Promise<PurchaseResult> {
        const isExpoGo = __DEV__ && Constants.appOwnership === 'expo';

        if (isExpoGo) {
            return this.mockPurchase(productId);
        }

        const apiKey = this.getApiKey();

        if (!apiKey) {
            throw new Error(`RevenueCat not configured for ${Platform.OS}`);
        }

        try {

            if (!this.isInitialized) {
                await this.initialize();
            }

            // Get the products to find the package
            const products = await this.getProducts();
            const product = products.find(p => p.id === productId || p.rcPackageId === productId);

            if (!product) {
                return {
                    success: false,
                    error: `Product ${productId} not found in available STYLO products.`
                };
            }

            // A native store purchase must have a real RevenueCat package.
            if (!product.package || Object.keys(product.package).length === 0) {
                throw new Error('The store package is unavailable. Please try again.');
            }


            // Purchase using the Package object
            const { customerInfo } = await Purchases.purchasePackage(product.package);


            // Check if the user now has the pro entitlement
            const isPro = hasPro(customerInfo);

            if (isPro) {
                return {
                    success: true,
                    productId: product.id,
                    transactionId: customerInfo.originalPurchaseDate || new Date().toISOString()
                };
            } else {
                console.warn("PaymentService: STYLO purchase completed but pro entitlement not found");
                return {
                    success: false,
                    error: 'Purchase completed but STYLO pro entitlement not activated. Please contact support.'
                };
            }

        } catch (error: unknown) {
            console.error("PaymentService: STYLO purchase failed:");

            if (error && typeof error === 'object' && 'code' in error) {
                const purchaseError = error as { code: string; message?: string };

                switch (purchaseError.code) {
                    case 'PURCHASE_CANCELLED':
                        return { success: false, error: 'Purchase was cancelled' };
                    case 'STORE_PROBLEM':
                        return { success: false, error: 'There was a problem with the App Store' };
                    case 'PURCHASE_NOT_ALLOWED':
                        return { success: false, error: 'Purchases are not allowed on this device' };
                    case 'PURCHASE_INVALID':
                        return { success: false, error: 'Purchase receipt is invalid' };
                    case 'PRODUCT_NOT_AVAILABLE':
                        return { success: false, error: 'Product not available. Please check your RevenueCat configuration.' };
                    case 'PRODUCT_NOT_AVAILABLE_FOR_PURCHASE':
                        return { success: false, error: 'Product not available for purchase. Check App Store Connect.' };
                    case 'PRODUCT_ALREADY_PURCHASED':
                        return { success: false, error: 'Product already purchased. Try restoring purchases.' };
                    default:
                        return { success: false, error: purchaseError.message || `Purchase failed with code: ${purchaseError.code}` };
                }
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    private async mockRestore(): Promise<PurchaseResult[]> {

        try {
            const mockProStatus = await AsyncStorage.getItem('stylo_pro_status');
            const subscriptionType = await AsyncStorage.getItem('stylo_subscription_type');

            if (mockProStatus === 'true') {
                return [{
                    success: true,
                    productId: subscriptionType === 'yearly' ? 'stylo_pro_yearly' : 'stylo_pro_monthly',
                    transactionId: `stylo_mock_restore_${Date.now()}`
                }];
            }
        } catch (error) {
            console.warn("PaymentService: Failed to check mock STYLO pro status:");
        }

        // For development, return empty array (no previous purchases)
        return [];
    }

    async restorePurchases(): Promise<PurchaseResult[]> {
        const isExpoGo = __DEV__ && Constants.appOwnership === 'expo';

        if (isExpoGo) {
            return this.mockRestore();
        }

        const apiKey = this.getApiKey();

        if (!apiKey) {
            throw new Error(`RevenueCat not configured for ${Platform.OS}`);
        }

        try {

            if (!this.isInitialized) {
                await this.initialize();
            }

            const customerInfo = await Purchases.restorePurchases();
            const results: PurchaseResult[] = [];

            Object.entries(customerInfo.entitlements.active).forEach(([entitlementId, entitlement]) => {
                results.push({
                    success: true,
                    productId: entitlement.productIdentifier,
                    transactionId: entitlement.originalPurchaseDate
                });
            });

            return results;

        } catch (error: unknown) {
            console.error("PaymentService: Failed to restore STYLO purchases:");
            throw error;
        }
    }

    async getCustomerInfo(): Promise<CustomerInfo | null> {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const customerInfo = await Purchases.getCustomerInfo();
            return customerInfo;
        } catch (error: unknown) {
            console.error("PaymentService: Failed to get STYLO customer info:");
            return null;
        }
    }

    private async mockIsProUser(): Promise<boolean> {
        try {
            return (await AsyncStorage.getItem('stylo_pro_status')) === 'true';
        } catch {
            return false;
        }
    }

    async isProUser(): Promise<boolean> {
        const isExpoGo = __DEV__ && Constants.appOwnership === 'expo';

        if (isExpoGo) {
            return await this.mockIsProUser();
        }

        const apiKey = this.getApiKey();

        if (!apiKey) {
            throw new Error(`RevenueCat not configured for ${Platform.OS}`);
        }

        try {
            const customerInfo = await this.getCustomerInfo();
            return hasPro(customerInfo);
        } catch (error) {
            console.error("PaymentService: Failed to check pro status:");
            return false;
        }
    }

    async getSubscriptionType(): Promise<'monthly' | 'yearly' | null> {
        const isExpoGo = __DEV__ && Constants.appOwnership === 'expo';

        if (isExpoGo) {
            try {
                const subscriptionType = await AsyncStorage.getItem('stylo_subscription_type');
                return subscriptionType as 'monthly' | 'yearly' | null;
            } catch {
                return null;
            }
        }

        try {
            const customerInfo = await this.getCustomerInfo();
            if (!customerInfo || !hasPro(customerInfo)) return null;

            // Get the active pro entitlement and check its product identifier
            const proEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
            if (!proEntitlement) return null;

            const productId = proEntitlement.productIdentifier;

            // Determine subscription type based on product ID
            if (productId.includes('annual') || productId.includes('yearly')) {
                return 'yearly';
            } else if (productId.includes('monthly')) {
                return 'monthly';
            }

            return null;
        } catch (error) {
            console.error("PaymentService: Failed to get subscription type:");
            return null;
        }
    }

    // Method to log out user (for switching test users)
    async logOut(): Promise<void> {
        try {
            if (this.isInitialized) {
                await Purchases.logOut();
            }
        } catch (error) {
            console.error("PaymentService: Failed to log out user:");
        }
    }

    // Clean up listeners
    cleanup(): void {
        if (this.customerInfoRemoveListener) {
            this.customerInfoRemoveListener();
            this.customerInfoRemoveListener = null;
        }
        this.customerInfoListener = null;
    }

    isReady(): boolean {
        return this.isInitialized;
    }

    // STYLO-specific method to clear mock subscription (for testing)
    async clearMockSubscription(): Promise<void> {
        try {
            await AsyncStorage.removeItem('stylo_pro_status');
            await AsyncStorage.removeItem('stylo_subscription_type');
        } catch (error) {
            console.warn("PaymentService: Failed to clear mock subscription:");
        }
    }
}

export default new PaymentService();